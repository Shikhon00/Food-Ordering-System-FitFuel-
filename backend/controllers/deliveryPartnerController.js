import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import deliveryPartnerModel from "../models/deliveryPartnerModel.js";
import orderModel from "../models/orderModel.js";
import {
    attachDeliveryMeta,
    getDeliveryMeta,
    markDeliveryFailed,
    markPickupDelayed,
} from "../utils/deliveryRules.js";

const SHOP_LOCATION = "Nearest FitFuel Kitchen Hub, Dhaka";
const DELIVERY_STATUS_FLOW = ["Accepted", "Picked up food", "On the way", "Near customer", "Delivered"];
const IN_TRANSIT_DELIVERY_STATUSES = ["Picked up food", "Picked up package", "Picked up from shop", "On the way", "Near customer"];
const normalizeDeliveryStatus = (status = "Accepted") =>
    status === "Picked up package" || status === "Picked up from shop" ? "Picked up food" : status;

// Delivery partner login uses JWT just like normal users.
const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

// Every delivery status change is saved as a timeline entry for tracking.
const buildTimelineEntry = (label, note = "") => ({
    label,
    note,
    time: new Date(),
});

// Removes sensitive fields like password before sending partner data to frontend/admin.
const formatPartner = (partner) => ({
    _id: partner._id,
    name: partner.name,
    email: partner.email,
    phone: partner.phone,
    vehicleType: partner.vehicleType,
    status: partner.status,
    availability: partner.availability,
    currentOrderId: partner.currentOrderId,
    lastKnownLocation: partner.lastKnownLocation,
    warningCount: partner.warningCount,
    failedDeliveries: partner.failedDeliveries,
    reportCount: partner.reportCount || 0,
    deliveredCount: partner.deliveredCount || 0,
    lastWarningReason: partner.lastWarningReason,
});

// Rider registration creates a Pending Approval account for admin review.
const registerDeliveryPartner = async (req, res) => {
    const { name, email, password, phone, vehicleType } = req.body;

    try {
        if (!name || !phone || !password || !email) {
            return res.json({ success: false, message: "All delivery partner fields are required" });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters" });
        }

        const exists = await deliveryPartnerModel.findOne({ email });

        if (exists) {
            return res.json({ success: false, message: "Delivery partner already exists" });
        }

        // Rider password is hashed before saving.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const partner = await deliveryPartnerModel.create({
            name,
            email,
            password: hashedPassword,
            phone,
            vehicleType: vehicleType || "Bike",
        });

        res.json({
            success: true,
            message: "Registration submitted. Admin approval is required before delivery work.",
            data: formatPartner(partner),
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Rider login works even before approval, but unapproved riders cannot take tasks.
const loginDeliveryPartner = async (req, res) => {
    const { email, password } = req.body;

    try {
        const partner = await deliveryPartnerModel.findOne({ email });

        if (!partner) {
            return res.json({ success: false, message: "Delivery partner does not exist" });
        }

        const isMatch = await bcrypt.compare(password, partner.password);

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid delivery login credentials" });
        }

        if (partner.status === "Rejected") {
            return res.json({
                success: false,
                message: "Your delivery partner account was rejected by admin. Please contact FitFuel support.",
            });
        }

        const token = createToken(partner._id);

        res.json({
            success: true,
            token,
            data: formatPartner(partner),
            message:
                partner.status === "Approved"
                    ? "Delivery login successful"
                    : "Your account is waiting for admin approval",
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Returns the logged-in rider profile plus delivered order count.
const getDeliveryProfile = async (req, res) => {
    try {
        const partner = await deliveryPartnerModel.findById(req.body.partnerId);

        if (!partner) {
            return res.json({ success: false, message: "Delivery partner not found" });
        }

        const deliveredCount = await orderModel.countDocuments({
            $and: [
                {
                    $or: [
                        { "assignedDeliveryPartner._id": partner._id },
                        { "assignedDeliveryPartner._id": String(partner._id) },
                    ],
                },
                { $or: [{ status: "Delivered" }, { deliveryStatus: "Delivered" }] },
            ],
        });
        res.json({ success: true, data: { ...formatPartner(partner), deliveredCount } });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Admin screen uses this to see all riders and their delivery/report counts.
const listDeliveryPartners = async (req, res) => {
    try {
        const partners = await deliveryPartnerModel.find({}).sort({ createdAt: -1 });
        const deliveredOrders = await orderModel.find({
            $or: [{ status: "Delivered" }, { deliveryStatus: "Delivered" }],
            assignedDeliveryPartner: { $ne: null },
        });
        // Count delivered orders per rider from completed order history.
        const deliveredCounts = deliveredOrders.reduce((counts, order) => {
            const partnerId = String(order.assignedDeliveryPartner?._id || "");
            if (partnerId) {
                counts[partnerId] = (counts[partnerId] || 0) + 1;
            }
            return counts;
        }, {});
        const data = partners.map((partner) => ({
            ...formatPartner(partner),
            deliveredCount: deliveredCounts[String(partner._id)] || 0,
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Admin approves, rejects, or moves a rider back to Pending Approval.
const approveDeliveryPartner = async (req, res) => {
    const { partnerId, status } = req.body;

    try {
        if (!["Approved", "Rejected", "Pending Approval"].includes(status)) {
            return res.json({ success: false, message: "Invalid delivery partner status" });
        }

        const partner = await deliveryPartnerModel.findById(partnerId);

        if (!partner) {
            return res.json({ success: false, message: "Delivery partner not found" });
        }

        if (status === "Rejected" && partner.currentOrderId) {
            return res.json({
                success: false,
                message: "Cannot reject a delivery partner with an active delivery. Reassign or complete the order first.",
            });
        }

        partner.status = status;
        partner.availability = status === "Approved" ? "Free" : "Offline";
        if (status !== "Approved") {
            partner.currentOrderId = "";
        }
        await partner.save();

        const message =
            status === "Rejected"
                ? "Delivery partner rejected and moved offline"
                : `Delivery partner marked as ${status}`;

        res.json({ success: true, message, data: formatPartner(partner) });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Rider starts or ends shift by changing availability.
const updateAvailability = async (req, res) => {
    const { availability } = req.body;

    try {
        if (!["Free", "Offline"].includes(availability)) {
            return res.json({ success: false, message: "Invalid availability" });
        }

        const partner = await deliveryPartnerModel.findById(req.body.partnerId);

        if (!partner || partner.status !== "Approved") {
            return res.json({ success: false, message: "Admin approval is required before working" });
        }

        // A rider cannot manually become Free or Offline while carrying an active order.
        // Real delivery apps only release the rider after delivery completion or task rejection.
        if (partner.currentOrderId) {
            return res.json({ success: false, message: "Finish or reject your current order before changing availability" });
        }

        partner.availability = availability;
        await partner.save();

        res.json({ success: true, message: `You are now ${availability}`, data: formatPartner(partner) });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Loads active tasks, delivered task history, and open orders for the rider panel.
const getDeliveryTasks = async (req, res) => {
    try {
        const partner = await deliveryPartnerModel.findById(req.body.partnerId);

        if (!partner || partner.status !== "Approved") {
            return res.json({ success: false, message: "Admin approval is required before working", data: [] });
        }

        const partnerId = String(partner._id);

        // Old and new orders may store the rider id slightly differently inside the mixed order object.
        // This query supports both forms so accepted tasks always appear in the rider panel.
        const partnerOrders = await orderModel
            .find({
                $or: [
                    { "assignedDeliveryPartner._id": partner._id },
                    { "assignedDeliveryPartner._id": partnerId },
                ],
            })
            .sort({ date: -1 });

        for (const order of partnerOrders) {
            const meta = getDeliveryMeta(order);

            if (meta.isPickupLate) {
                await markPickupDelayed(order, partner);
            }
            else if (meta.isExpired && IN_TRANSIT_DELIVERY_STATUSES.includes(order.deliveryStatus)) {
                await markDeliveryFailed(order, partner);
            }
        }

        const refreshedPartnerOrders = await orderModel
            .find({
                $or: [
                    { "assignedDeliveryPartner._id": partner._id },
                    { "assignedDeliveryPartner._id": partnerId },
                ],
            })
            .sort({ date: -1 });

        // Split tasks into active and delivered sections for the rider UI.
        const assignedOrders = refreshedPartnerOrders
            .filter((order) =>
                !["Delivered", "Cancelled", "Expired", "Delivery Failed", "Pickup Delayed"].includes(order.deliveryStatus) &&
                !["Delivered", "Cancelled", "Payment Cancelled", "Refunded", "Expired", "Delivery Failed"].includes(order.status)
            )
            .map((order) => attachDeliveryMeta(order));
        const deliveredOrders = refreshedPartnerOrders
            .filter((order) => order.deliveryStatus === "Delivered")
            .map((order) => attachDeliveryMeta(order));

        // Open orders are paid food orders with no assigned rider yet.
        const openOrders = await orderModel
            .find({
                payment: true,
                assignedDeliveryPartner: null,
                status: { $nin: ["Delivered", "Cancelled", "Payment Cancelled", "Refunded", "Expired"] },
            })
            .sort({ date: 1 })
            .limit(50);

        res.json({
            success: true,
            data: {
                assignedOrders,
                deliveredOrders,
                openOrders: openOrders.map((order) => attachDeliveryMeta(order)),
                shopLocation: "Kitchen hub is shown on each food order",
            },
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Rider can take an open paid order if they are approved and free.
const claimDeliveryTask = async (req, res) => {
    const { orderId } = req.body;

    try {
        const partner = await deliveryPartnerModel.findById(req.body.partnerId);

        if (!partner || partner.status !== "Approved") {
            return res.json({ success: false, message: "Admin approval is required before working" });
        }

        if (partner.availability !== "Free") {
            return res.json({ success: false, message: "You must be free before taking a delivery" });
        }

        const order = await orderModel.findById(orderId);

        if (!order || !order.payment || order.assignedDeliveryPartner) {
            return res.json({ success: false, message: "This delivery is no longer available" });
        }

        const deliveryMeta = getDeliveryMeta(order);

        if (deliveryMeta.isPickupLate) {
            await markPickupDelayed(order, partner);
            return res.json({ success: false, message: "Pickup deadline missed. Admin review is required." });
        }

        // Store the id as a string in the order snapshot so future lookups are predictable.
        order.assignedDeliveryPartner = { ...formatPartner(partner), _id: String(partner._id) };
        order.deliveryStatus = "Accepted";
        order.deliveryTimeline = [
            ...(order.deliveryTimeline || []),
            buildTimelineEntry("Accepted", `${partner.name} accepted the delivery task`),
        ];
        await order.save();

        partner.availability = "Busy";
        partner.currentOrderId = String(order._id);
        await partner.save();

        res.json({ success: true, message: "Delivery task accepted", data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Rider can reject a currently assigned task, returning it to the open queue.
const rejectDeliveryTask = async (req, res) => {
    const { orderId } = req.body;

    try {
        const partner = await deliveryPartnerModel.findById(req.body.partnerId);
        const order = await orderModel.findById(orderId);

        if (!partner || !order) {
            return res.json({ success: false, message: "Delivery task not found" });
        }

        if (String(order.assignedDeliveryPartner?._id) !== String(partner._id)) {
            return res.json({ success: false, message: "This task is not assigned to you" });
        }

        order.assignedDeliveryPartner = null;
        order.deliveryStatus = "Waiting for assignment";
        order.deliveryTimeline = [
            ...(order.deliveryTimeline || []),
            buildTimelineEntry("Rejected", `${partner.name} rejected the delivery task`),
        ];
        await order.save();

        partner.availability = "Free";
        partner.currentOrderId = "";
        await partner.save();

        res.json({ success: true, message: "Task rejected and returned to assignment queue" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Rider progresses delivery through accepted -> picked up -> on the way -> delivered.
const updateDeliveryStatus = async (req, res) => {
    const { orderId, deliveryStatus, locationNote } = req.body;

    try {
        const partner = await deliveryPartnerModel.findById(req.body.partnerId);
        const order = await orderModel.findById(orderId);

        if (!DELIVERY_STATUS_FLOW.includes(deliveryStatus)) {
            return res.json({ success: false, message: "Invalid delivery status" });
        }

        if (!partner || !order || String(order.assignedDeliveryPartner?._id) !== String(partner._id)) {
            return res.json({ success: false, message: "Delivery task not found" });
        }

        if (["Cancelled", "Payment Cancelled", "Refunded", "Expired", "Delivery Failed"].includes(order.status)) {
            partner.availability = "Free";
            partner.currentOrderId = "";
            await partner.save();
            return res.json({ success: false, message: "This order is already closed" });
        }

        const deliveryMeta = getDeliveryMeta(order);

        if (deliveryMeta.isPickupLate) {
            await markPickupDelayed(order, partner);
            return res.json({ success: false, message: "Pickup deadline missed. Admin review is required." });
        }

        if (deliveryMeta.isExpired) {
            await markDeliveryFailed(order, partner);
            return res.json({ success: false, message: "Delivery deadline missed. Admin review is required." });
        }

        const currentStatusIndex = DELIVERY_STATUS_FLOW.indexOf(normalizeDeliveryStatus(order.deliveryStatus || "Accepted"));
        const requestedStatusIndex = DELIVERY_STATUS_FLOW.indexOf(deliveryStatus);

        // Delivery can only move forward. This prevents a rider from changing
        // "Near customer" back to "Picked up food" after progress is made.
        if (requestedStatusIndex <= currentStatusIndex) {
            return res.json({
                success: false,
                message: `Next status must come after ${order.deliveryStatus || "Accepted"}`,
            });
        }

        order.deliveryStatus = deliveryStatus;

        if (IN_TRANSIT_DELIVERY_STATUSES.includes(deliveryStatus)) {
            order.status = "Out for Delivery";
        }

        if (deliveryStatus === "Delivered") {
            order.status = "Delivered";
            partner.availability = "Free";
            partner.currentOrderId = "";
        }

        const note = locationNote || partner.lastKnownLocation || order.address?.shopAddress || SHOP_LOCATION;
        partner.lastKnownLocation = note;
        order.deliveryTimeline = [
            ...(order.deliveryTimeline || []),
            buildTimelineEntry(deliveryStatus, note),
        ];

        await order.save();
        await partner.save();

        res.json({ success: true, message: `Delivery status changed to ${deliveryStatus}`, data: order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

export {
    registerDeliveryPartner,
    loginDeliveryPartner,
    getDeliveryProfile,
    listDeliveryPartners,
    approveDeliveryPartner,
    updateAvailability,
    getDeliveryTasks,
    claimDeliveryTask,
    rejectDeliveryTask,
    updateDeliveryStatus,
};
