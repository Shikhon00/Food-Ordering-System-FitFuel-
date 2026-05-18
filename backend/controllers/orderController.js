import orderModel from "../models/orderModel.js";
import userModel from '../models/userModel.js'
import foodModel from "../models/foodModel.js";
import deliveryPartnerModel from "../models/deliveryPartnerModel.js";
import Stripe from "stripe"
import { sendEmail } from "../config/mailer.js";
import {
    attachDeliveryMeta,
    getDeliveryMeta,
    isSupportedDivision,
    markDeliveryFailed,
    markPickupDelayed,
} from "../utils/deliveryRules.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Admin status changes must follow this flow. This prevents skipping from a
// starting state directly into an invalid final state.
const ORDER_STATUS_FLOW = {
    "Product Processing": ["Out for Delivery", "Cancelled"],
    "Food Processing": ["Out for Delivery", "Cancelled"],
    "Out for Delivery": ["Delivered", "Cancelled"],
    "Delivered": [],
    "Cancelled": [],
    "Payment Cancelled": [],
    "Expired": [],
};
const IN_TRANSIT_DELIVERY_STATUSES = ["Picked up package", "Picked up from shop", "On the way", "Near customer"];
const PAYMENT_CHECKOUT_HOLD_MINUTES = 20;

// Date helpers for daily/monthly dashboard totals and CSV reports.
const startOfDay = (date = new Date()) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfMonth = (date = new Date()) =>
    new Date(date.getFullYear(), date.getMonth(), 1);

const formatReportDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const escapeCsvValue = (value) => {
    const normalizedValue = value ?? "";
    const stringValue = String(normalizedValue).replace(/"/g, '""');
    return `"${stringValue}"`;
};

// Converts order records into a CSV string for the admin report download.
const createOrderCsv = (orders) => {
    const header = [
        "Order ID",
        "Date",
        "Customer",
        "Email",
        "Phone",
        "Items",
        "Amount",
        "Payment",
        "Status",
    ];

    const rows = orders.map((order) => [
        order._id,
        formatReportDate(order.date),
        `${order.address?.firstName || ""} ${order.address?.lastName || ""}`.trim(),
        order.address?.email || "",
        order.address?.phone || "",
        order.items.map((item) => `${item.name} x ${item.quantity}`).join(" | "),
        order.amount,
        order.payment ? "Paid" : "Pending",
        order.status,
    ]);

    return [header, ...rows]
        .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
        .join("\n");
};

// Calculates the total macros for an order at checkout time.
const calculateNutritionTotals = (items = []) =>
    items.reduce(
        (totals, item) => ({
            calories: totals.calories + Number(item.calories || 0) * Number(item.quantity || 0),
            protein: totals.protein + Number(item.protein || 0) * Number(item.quantity || 0),
            carbs: totals.carbs + Number(item.carbs || 0) * Number(item.quantity || 0),
            fat: totals.fat + Number(item.fat || 0) * Number(item.quantity || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

const restoreReservedStock = async (order) => {
    if (!order || order.stockRestored) {
        return;
    }

    // Every checkout reserves stock before Stripe payment is completed.
    // If payment fails, we add those quantities back.
    for (const item of order.items) {
        await foodModel.findByIdAndUpdate(item._id, {
            $inc: { quantity: item.quantity }
        });
    }

    order.stockRestored = true;
};

// If checkout fails, the user should not lose the products they tried to buy.
const restoreUserCart = async (order) => {
    if (!order?.userId) {
        return;
    }

    const user = await userModel.findById(order.userId);
    const currentCart = user?.cartData || {};
    const restoredCart = { ...currentCart };

    for (const item of order.items || []) {
        restoredCart[item._id] = Number(restoredCart[item._id] || 0) + Number(item.quantity || 0);
    }

    await userModel.findByIdAndUpdate(order.userId, { cartData: restoredCart });
};

// Removes unpaid temporary orders and rolls back stock/cart changes.
const removeUnpaidCheckoutOrder = async (order, reason = "Payment failed or cancelled") => {
    if (!order || order.payment) {
        return;
    }

    await restoreReservedStock(order);
    await restoreUserCart(order);
    await orderModel.findByIdAndDelete(order._id);
};

// Keeps the database clean if a user starts Stripe checkout but never returns.
const cleanupStaleCheckoutOrders = async (userId = null) => {
    const staleBefore = new Date(Date.now() - PAYMENT_CHECKOUT_HOLD_MINUTES * 60 * 1000);
    const query = {
        payment: false,
        paymentStatus: "Pending",
        date: { $lte: staleBefore },
    };

    if (userId) {
        query.userId = userId;
    }

    const staleOrders = await orderModel.find(query);

    for (const order of staleOrders) {
        await removeUnpaidCheckoutOrder(order, "Checkout payment timeout");
    }
};

// Checks delivery timing rules whenever orders are loaded by admin/customer.
const reviewDeliveryWindows = async (orders = []) => {
    for (const order of orders) {
        const deliveryMeta = getDeliveryMeta(order);
        const partnerId = order.assignedDeliveryPartner?._id;
        const partner = partnerId ? await deliveryPartnerModel.findById(partnerId) : null;

        if (deliveryMeta.isPickupLate) {
            await markPickupDelayed(order, partner);
        }
        else if (deliveryMeta.isExpired && IN_TRANSIT_DELIVERY_STATUSES.includes(order.deliveryStatus)) {
            await markDeliveryFailed(order, partner);
        }
    }
};

// Places a user order, reserves stock, clears the cart, then creates a Stripe checkout session.
const placeOrder = async (req, res) => {

    const frontend_url = (process.env.FRONTEND_URL || "http://localhost:5173").trim()
    let newOrder;
    const decrementedItems = [];

    try {
        const normalizedOrderItems = [];
        const division = req.body.address?.division;

        // Delivery is intentionally limited to Bangladesh divisions in this project.
        if (req.body.address?.country && req.body.address.country !== "Bangladesh") {
            return res.json({ success: false, message: "Delivery is available only inside Bangladesh" });
        }

        if (!isSupportedDivision(division)) {
            return res.json({ success: false, message: "Please select a valid Bangladesh division" });
        }

        // Read fresh product data from MongoDB instead of trusting the frontend payload.
        for (const item of req.body.items) {
            const foodItem = await foodModel.findById(item._id);

            if (!foodItem) {
                return res.json({ success: false, message: `${item.name} is no longer available` });
            }

            if (item.quantity > foodItem.quantity) {
                return res.json({ success: false, message: `Only ${foodItem.quantity} ${item.name} left in stock` });
            }

            normalizedOrderItems.push({
                _id: foodItem._id,
                name: foodItem.name,
                description: foodItem.description,
                price: foodItem.price,
                image: foodItem.image,
                category: foodItem.category,
                quantity: Number(item.quantity),
                calories: Number(foodItem.calories || 0),
                protein: Number(foodItem.protein || 0),
                carbs: Number(foodItem.carbs || 0),
                fat: Number(foodItem.fat || 0),
                shelfLifeDays: Number(foodItem.shelfLifeDays || 180),
            });
        }

        // Reduce stock before payment so two customers cannot buy the last item at once.
        for (const item of normalizedOrderItems) {
            const updatedFood = await foodModel.findOneAndUpdate(
                { _id: item._id, quantity: { $gte: item.quantity } },
                { $inc: { quantity: -item.quantity } },
                { new: true }
            );

            if (!updatedFood) {
                throw new Error(`${item.name} is no longer available in the requested quantity`);
            }

            decrementedItems.push(item);
        }

        // The order is saved as unpaid until Stripe redirects back successfully.
        newOrder = new orderModel({
            userId: req.body.userId,
            items: normalizedOrderItems,
            amount: req.body.amount,
            nutritionTotals: calculateNutritionTotals(normalizedOrderItems),
            address: req.body.address
        })
        await newOrder.save();

        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        // Stripe needs line items in smallest currency units. Here Tk is converted
        // approximately to USD cents for the demo checkout.
        const line_items = normalizedOrderItems.map((item) => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name
                },
                unit_amount: Math.round((item.price / 127) * 100)
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency: "usd",
                product_data: {
                    name: "Delivery Charges"
                },
                unit_amount: Math.round((60 / 127) * 100)
            },
            quantity: 1
        })

        // Stripe redirects back to /verify with success=true or success=false.
        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: 'payment',
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        })

        res.json({ success: true, session_url: session.url, orderId: newOrder._id })

    } catch (error) {
        // If anything fails after stock was reduced, rollback keeps inventory correct.
        for (const item of decrementedItems) {
            await foodModel.findByIdAndUpdate(item._id, {
                $inc: { quantity: item.quantity }
            });
        }

        if (newOrder) {
            await orderModel.findByIdAndDelete(newOrder._id);
        }

        console.log(error);
        res.json({ success: false, message: error.message || "Error" })
    }
}

// Called from the frontend /verify page after Stripe sends the user back.
const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success == "true") {
            const order = await orderModel.findById(orderId);

            if (!order) {
                return res.json({ success: false, message: "Order not found" });
            }

            // A successful Stripe return turns the temporary checkout order into a real paid order.
            await orderModel.findByIdAndUpdate(orderId, { payment: true, paymentStatus: "Paid" });

            if (!order.confirmationEmailSent && order.address?.email) {
                const itemsHtml = order.items
                    .map((item) => `<li>${item.name} x ${item.quantity}</li>`)
                    .join("");

                try {
                    await sendEmail({
                        to: order.address.email,
                        subject: "Your Nutrition Order is Confirmed",
                        html: `
                            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                                <h2>Order Confirmation</h2>
                                <p>Thanks for your order. Your payment was successful.</p>
                                <p><strong>Order ID:</strong> ${order._id}</p>
                                <p><strong>Delivery To:</strong> ${order.address.firstName || ""} ${order.address.lastName || ""}</p>
                                <p><strong>Items:</strong></p>
                                <ul>${itemsHtml}</ul>
                                <p><strong>Total:</strong> Tk ${order.amount}</p>
                            </div>
                        `,
                    });

                    await orderModel.findByIdAndUpdate(orderId, { confirmationEmailSent: true });
                } catch (mailError) {
                    console.log("Order confirmation email error:", mailError);
                }
            }

            res.json({ success: true, message: "Paid" })
        }
        else {
            const order = await orderModel.findById(orderId);

            if (order?.payment) {
                return res.json({ success: true, message: "Order already paid" });
            }

            // Failed/cancelled payment means no order should remain in the system.
            await removeUnpaidCheckoutOrder(order, "Customer cancelled payment checkout");

            res.json({
                success: false,
                message: "Payment failed or cancelled. Your cart has been restored and no order was created."
            })
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// Returns paid orders for one customer, with delivery meta attached for tracking UI.
const userOrders = async (req, res) => {
    try {
        await cleanupStaleCheckoutOrders(req.body.userId);
        const orders = await orderModel.find({ userId: req.body.userId, payment: true });
        await reviewDeliveryWindows(orders);
        const refreshedOrders = await orderModel.find({ userId: req.body.userId, payment: true });
        res.json({ success: true, data: refreshedOrders.map((order) => attachDeliveryMeta(order)) })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
}

// Returns all paid orders for the admin panel.
const listOrders = async (req, res) => {
    try {
        await cleanupStaleCheckoutOrders();
        const orders = await orderModel.find({ payment: true }).sort({ date: -1 });
        await reviewDeliveryWindows(orders);
        const refreshedOrders = await orderModel.find({ payment: true }).sort({ date: -1 });
        res.json({ success: true, data: refreshedOrders.map((order) => attachDeliveryMeta(order)) });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Admin updates product/order status, but only through allowed status transitions.
const updateStatus = async (req, res) => {
    const { orderId, status } = req.body;

    try {
        if (!orderId || !status) {
            return res.json({ success: false, message: "Order ID and status are required" });
        }

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (order.status === status) {
            return res.json({ success: true, message: "Order status is already up to date", data: order });
        }

        const allowedNextStatuses = ORDER_STATUS_FLOW[order.status] || [];

        if (!allowedNextStatuses.includes(status)) {
            return res.json({
                success: false,
                message: `Cannot change status from ${order.status} to ${status}`,
            });
        }

        order.status = status;
        await order.save();

        res.json({ success: true, message: "Order status updated", data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Admin assigns a free, approved delivery partner to a paid order.
const assignDeliveryPartner = async (req, res) => {
    const { orderId, partnerId } = req.body;

    try {
        const order = await orderModel.findById(orderId);
        const partner = await deliveryPartnerModel.findById(partnerId);

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (!partner || partner.status !== "Approved" || partner.availability !== "Free") {
            return res.json({ success: false, message: "Select an approved and free delivery partner" });
        }

        if (!order.payment) {
            return res.json({ success: false, message: "Only paid orders can be assigned for delivery" });
        }

        if (["Delivered", "Cancelled", "Payment Cancelled", "Expired"].includes(order.status)) {
            return res.json({ success: false, message: "This order is already closed" });
        }

        // Store a small snapshot of the partner on the order for easy tracking display.
        order.assignedDeliveryPartner = {
            _id: String(partner._id),
            name: partner.name,
            email: partner.email,
            phone: partner.phone,
            vehicleType: partner.vehicleType,
        };
        order.deliveryStatus = "Assigned";
        order.deliveryTimeline = [
            ...(order.deliveryTimeline || []),
            {
                label: "Assigned",
                note: `Admin assigned ${partner.name} for delivery`,
                time: new Date(),
            },
        ];
        await order.save();

        // The rider becomes busy so another order cannot be assigned to them at the same time.
        partner.availability = "Busy";
        partner.currentOrderId = String(order._id);
        await partner.save();

        res.json({ success: true, message: "Delivery partner assigned", data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Customer reports a rider after a delivered order if something went wrong.
const reportRider = async (req, res) => {
    const { orderId, reason } = req.body;

    try {
        const order = await orderModel.findById(orderId);

        if (!order || String(order.userId) !== String(req.body.userId)) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (order.status !== "Delivered" && order.deliveryStatus !== "Delivered") {
            return res.json({ success: false, message: "You can report a rider only after an order is marked delivered" });
        }

        const partnerId = order.assignedDeliveryPartner?._id;

        if (!partnerId) {
            return res.json({ success: false, message: "No delivery partner was assigned to this order" });
        }

        if (order.riderReported) {
            return res.json({ success: false, message: "You have already reported this delivery" });
        }

        // Limit the text length so reports stay readable in admin screens.
        const reportReason = String(reason || "Customer did not receive the product").trim().slice(0, 300);
        order.riderReported = true;
        order.riderReportReason = reportReason;
        order.riderReportedAt = new Date();
        order.deliveryReviewRequired = true;
        order.deliveryIssueReason = reportReason;
        order.deliveryTimeline = [
            ...(order.deliveryTimeline || []),
            {
                label: "Rider Reported",
                note: reportReason,
                time: new Date(),
            },
        ];

        await order.save();
        await deliveryPartnerModel.findByIdAndUpdate(partnerId, {
            $inc: { reportCount: 1 },
            lastWarningReason: reportReason,
        });

        res.json({ success: true, message: "Report submitted. Admin will review this delivery." });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Admin can send a refund notice to the customer after reviewing a delivered order.
const sendRefundNotice = async (req, res) => {
    const { orderId } = req.body;
    const notice = "After inquiry, you will get back your money.";

    try {
        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (order.status !== "Delivered" && order.deliveryStatus !== "Delivered") {
            return res.json({ success: false, message: "Refund notice can be sent only for delivered orders" });
        }

        order.refundNotice = notice;
        order.refundNoticeAt = new Date();
        order.deliveryReviewRequired = true;
        order.deliveryIssueReason = notice;
        order.deliveryTimeline = [
            ...(order.deliveryTimeline || []),
            {
                label: "Refund Notice Sent",
                note: notice,
                time: new Date(),
            },
        ];

        await order.save();

        res.json({ success: true, message: "Refund notice sent to customer", data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Builds all numbers and lists used by the admin dashboard.
const getDashboardData = async (req, res) => {
    try {
        await cleanupStaleCheckoutOrders();
        const now = new Date();
        const todayStart = startOfDay(now);
        const monthStart = startOfMonth(now);

        // Orders and products are independent queries, so Promise.all loads them together.
        const [orders, products] = await Promise.all([
            orderModel.find({ payment: true }).sort({ date: -1 }),
            foodModel.find({}).sort({ quantity: 1 }),
        ]);

        const paidOrders = orders;
        const todayPaidOrders = paidOrders.filter((order) => new Date(order.date) >= todayStart);
        const monthPaidOrders = paidOrders.filter((order) => new Date(order.date) >= monthStart);

        const totalSales = paidOrders.reduce((sum, order) => sum + order.amount, 0);
        const todaySales = todayPaidOrders.reduce((sum, order) => sum + order.amount, 0);
        const monthlySales = monthPaidOrders.reduce((sum, order) => sum + order.amount, 0);
        const totalItemsSold = paidOrders.reduce(
            (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
            0
        );

        // Status breakdown powers the Order Pipeline chart in the admin dashboard.
        const statusBreakdown = Object.keys(ORDER_STATUS_FLOW).map((status) => ({
            status,
            count: orders.filter((order) => order.status === status).length,
        }));
        const cancelledOrders = orders.filter((order) =>
            order.status === "Cancelled" || order.status === "Payment Cancelled" || order.paymentStatus === "Cancelled"
        );
        const paymentPendingOrders = [];
        const awaitingAssignmentOrders = paidOrders.filter((order) =>
            !order.assignedDeliveryPartner &&
            !["Delivered", "Cancelled", "Payment Cancelled", "Expired", "Delivery Failed"].includes(order.status)
        );
        const activeDeliveryOrders = paidOrders.filter((order) =>
            order.assignedDeliveryPartner &&
            !["Delivered", "Cancelled", "Payment Cancelled", "Expired", "Delivery Failed"].includes(order.status)
        );
        // This smaller shape is exactly what the Assignment Queue UI needs.
        const unassignedPaidOrders = awaitingAssignmentOrders.map((order) => ({
            _id: order._id,
            customerName: `${order.address?.firstName || ""} ${order.address?.lastName || ""}`.trim(),
            area: order.address?.area || order.address?.city || order.address?.street || "Dhaka",
            amount: order.amount,
            date: order.date,
            itemsCount: order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        }));

        // Inventory Watch only shows the most urgent low-stock products.
        const lowStockProducts = products
            .filter((product) => Number(product.quantity) <= 5)
            .slice(0, 5)
            .map((product) => ({
                _id: product._id,
                name: product.name,
                category: product.category,
                quantity: product.quantity,
            }));

        // Recent Orders keeps the dashboard readable by showing only the latest few.
        const recentOrders = orders.slice(0, 6).map((order) => ({
            _id: order._id,
            customerName: `${order.address?.firstName || ""} ${order.address?.lastName || ""}`.trim(),
            amount: order.amount,
            status: order.status,
            payment: order.payment,
            date: order.date,
        }));

        res.json({
            success: true,
            data: {
                metrics: {
                    totalSales,
                    monthlySales,
                    todaySales,
                    totalOrders: orders.length,
                    paidOrders: paidOrders.length,
                    paymentPendingOrders: paymentPendingOrders.length,
                    cancelledOrders: cancelledOrders.length,
                    awaitingAssignmentOrders: awaitingAssignmentOrders.length,
                    activeDeliveryOrders: activeDeliveryOrders.length,
                    totalProducts: products.length,
                    totalItemsSold,
                },
                statusBreakdown,
                lowStockProducts,
                unassignedPaidOrders,
                recentOrders,
            },
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Creates a downloadable daily or monthly CSV report for the admin.
const downloadReport = async (req, res) => {
    const { type } = req.query;

    try {
        if (!["daily", "monthly"].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid report type" });
        }

        const now = new Date();
        const rangeStart = type === "daily" ? startOfDay(now) : startOfMonth(now);
        const fileSuffix =
            type === "daily"
                ? now.toISOString().slice(0, 10)
                : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        await cleanupStaleCheckoutOrders();

        const orders = await orderModel.find({
            payment: true,
            date: { $gte: rangeStart, $lte: now },
        }).sort({ date: -1 });

        const csv = createOrderCsv(orders);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${type}-report-${fileSuffix}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error" });
    }
}

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus, assignDeliveryPartner, reportRider, sendRefundNotice, getDashboardData, downloadReport }
