import React, { useContext, useEffect, useState } from 'react'
import './MyOrders.css'
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';
import { assets } from '../../assets/assets';
import RatingModal from '../../components/RatingModal/RatingModal';

const AUTO_REFRESH_INTERVAL = 10000;
const ORDERS_PER_PAGE = 5;
const CLOSED_ORDER_STATUSES = ["Delivered", "Cancelled", "Payment Cancelled", "Refunded", "Expired", "Delivery Failed"];

const canCancelOrder = (order) =>
    order?.payment &&
    !CLOSED_ORDER_STATUSES.includes(order.status) &&
    order.deliveryStatus !== "Delivered";

// Uses saved order nutrition totals when available, otherwise recalculates from items.
const getOrderNutritionTotals = (order) => {
    const storedTotals = order?.nutritionTotals;

    if (
        storedTotals &&
        [storedTotals.calories, storedTotals.protein, storedTotals.carbs, storedTotals.fat].some(
            (value) => Number(value || 0) > 0
        )
    ) {
        return {
            calories: Number(storedTotals.calories || 0),
            protein: Number(storedTotals.protein || 0),
            carbs: Number(storedTotals.carbs || 0),
            fat: Number(storedTotals.fat || 0),
        };
    }

    return (order?.items || []).reduce(
        (totals, item) => ({
            calories: totals.calories + Number(item.calories || 0) * Number(item.quantity || 0),
            protein: totals.protein + Number(item.protein || 0) * Number(item.quantity || 0),
            carbs: totals.carbs + Number(item.carbs || 0) * Number(item.quantity || 0),
            fat: totals.fat + Number(item.fat || 0) * Number(item.quantity || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
};

// Formats the delivery deadline shown inside the tracking modal.
const formatDeadline = (value) => {
    if (!value) {
        return "Not available";
    }

    return new Date(value).toLocaleString();
};

// Customer order history page: order list, feedback, rider report, cancellation, and tracking.
const MyOrders = () => {

    const { url, token } = useContext(StoreContext);
    const [data, setData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrderForFeedback, setSelectedOrderForFeedback] = useState(null);
    const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
    const [selectedItemForReview, setSelectedItemForReview] = useState(null);
    const [orderFeedbacks, setOrderFeedbacks] = useState({});
    const [feedbackForm, setFeedbackForm] = useState({ rating: 0, comment: "" });
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);
    const [feedbackNotice, setFeedbackNotice] = useState("");
    const [orderNotice, setOrderNotice] = useState("");
    const [cancellingOrderId, setCancellingOrderId] = useState("");

    // Loads the logged-in user's paid orders from backend.
    const fetchOrders = async () => {
        const authToken = token || localStorage.getItem("token");

        if (!authToken) {
            return;
        }

        const response = await axios.post(url + "/api/order/userOrders", {}, { headers: { token: authToken } });
        setData(response.data.data || []);
    }

    // Auto-refresh keeps order/delivery status current without manual reload.
    useEffect(() => {
        const authToken = token || localStorage.getItem("token");

        if (!authToken) {
            return;
        }

        fetchOrders();

        const intervalId = window.setInterval(() => {
            fetchOrders();
        }, AUTO_REFRESH_INTERVAL);

        const handleFocus = () => {
            fetchOrders();
        };

        window.addEventListener("focus", handleFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
        };
    }, [token])

    // If orders shrink, keep pagination on a valid page.
    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(data.length / ORDERS_PER_PAGE));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, data])

    // Sort newest first and attach nutrition totals used in each order row.
    const normalizedOrders = data
        .map((order) => ({
            ...order,
            resolvedNutritionTotals: getOrderNutritionTotals(order),
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalPages = Math.max(1, Math.ceil(normalizedOrders.length / ORDERS_PER_PAGE));
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;

    // Loads existing reviews for this order, so user can see/edit previous feedback.
    const loadOrderFeedbacks = async (order) => {
        const authToken = token || localStorage.getItem("token");

        if (!authToken || !order?._id) {
            return;
        }

        try {
            const response = await axios.get(`${url}/api/feedback/order/${order._id}`, {
                headers: { token: authToken },
            });

            if (response.data.success) {
                // Convert feedback array into { foodId: feedback } for quick lookup in modal.
                const feedbackMap = (response.data.feedbacks || []).reduce((map, feedback) => {
                    map[String(feedback.foodId)] = feedback;
                    return map;
                }, {});

                setOrderFeedbacks(feedbackMap);
            } else {
                setFeedbackNotice(response.data.message || "Unable to load feedback status.");
            }
        } catch {
            setFeedbackNotice("Unable to load feedback status.");
        }
    };

    // Button opens feedback for delivered orders; otherwise opens tracking.
    const handleOpenFeedback = async (order) => {
        if (order.status !== "Delivered") {
            setSelectedTrackingOrder(order);
            return;
        }

        setSelectedOrderForFeedback(order);
        setSelectedItemForReview(null);
        setFeedbackNotice("");
        setOrderFeedbacks({});
        await loadOrderFeedbacks(order);
    };

    // Lets customer report a rider only after delivery is marked done.
    const handleReportRider = async (order) => {
        const authToken = token || localStorage.getItem("token");

        if (!authToken) {
            setOrderNotice("Please log in to report a delivery.");
            return;
        }

        const reason = window.prompt("Tell us what happened with this delivery:", "I did not receive this food.");

        if (reason === null) {
            return;
        }

        try {
            const response = await axios.post(
                `${url}/api/order/report-rider`,
                {
                    orderId: order._id,
                    reason: reason.trim() || "Customer did not receive the food",
                },
                { headers: { token: authToken } }
            );

            setOrderNotice(response.data.message || "Report submitted.");
            await fetchOrders();
        } catch {
            setOrderNotice("Unable to submit report.");
        }
    };

    // Cancels eligible paid orders and shows the refund message returned by backend.
    const handleCancelOrder = async (order) => {
        const authToken = token || localStorage.getItem("token");

        if (!authToken) {
            setOrderNotice("Please log in to cancel an order.");
            return;
        }

        if (!canCancelOrder(order)) {
            setOrderNotice("This order can not be cancelled.");
            return;
        }

        const confirmed = window.confirm("Are you sure you want to cancel this order?");

        if (!confirmed) {
            return;
        }

        setCancellingOrderId(order._id);

        try {
            const response = await axios.post(
                `${url}/api/order/cancel`,
                { orderId: order._id },
                { headers: { token: authToken } }
            );

            setOrderNotice(response.data.message || "Order cancellation request completed.");
            await fetchOrders();
        } catch {
            setOrderNotice("Unable to cancel this order right now.");
        } finally {
            setCancellingOrderId("");
        }
    };

    // Pre-fills form if the selected item already has feedback.
    const handleSelectReviewItem = (item, existingFeedback) => {
        setSelectedItemForReview(item);
        setFeedbackNotice("");
        setFeedbackForm({
            rating: Number(existingFeedback?.rating || 0),
            comment: existingFeedback?.comment || "",
        });
    };

    // Reset modal-related state when closing feedback.
    const handleCloseFeedbackModal = () => {
        setSelectedOrderForFeedback(null);
        setSelectedItemForReview(null);
        setOrderFeedbacks({});
        setFeedbackForm({ rating: 0, comment: "" });
        setFeedbackNotice("");
    };

    // Validates and submits one food review from a delivered order.
    const handleSubmitFeedback = async () => {
        const authToken = token || localStorage.getItem("token");

        if (!authToken) {
            setFeedbackNotice("Please log in to submit feedback.");
            return;
        }

        if (!selectedOrderForFeedback || selectedOrderForFeedback.status !== "Delivered") {
            setFeedbackNotice("Feedback is only available for delivered orders.");
            return;
        }

        if (!selectedItemForReview) {
            setFeedbackNotice("Please select a food item to review.");
            return;
        }

        if (!Number.isInteger(Number(feedbackForm.rating)) || Number(feedbackForm.rating) < 1 || Number(feedbackForm.rating) > 5) {
            setFeedbackNotice("Please select a rating from 1 to 5.");
            return;
        }

        if (!String(feedbackForm.comment || "").trim()) {
            setFeedbackNotice("Comment should not be empty.");
            return;
        }

        setIsSavingFeedback(true);
        setFeedbackNotice("");

        try {
            const response = await axios.post(
                `${url}/api/feedback/submit`,
                {
                    foodId: selectedItemForReview._id,
                    orderId: selectedOrderForFeedback._id,
                    rating: Number(feedbackForm.rating),
                    comment: feedbackForm.comment.trim(),
                },
                { headers: { token: authToken } }
            );

            if (response.data.success) {
                setFeedbackNotice("Feedback saved successfully.");
                await loadOrderFeedbacks(selectedOrderForFeedback);
                await fetchOrders();
                setSelectedItemForReview(null);
                setFeedbackForm({ rating: 0, comment: "" });
            } else {
                setFeedbackNotice(response.data.message || "Unable to save feedback.");
            }
        } catch {
            setFeedbackNotice("Unable to save feedback.");
        } finally {
            setIsSavingFeedback(false);
        }
    };

    return (
        <div className='my-orders'>
            {orderNotice ? <p className='my-orders-refresh-note'>{orderNotice}</p> : null}
            <div className="container">
                {normalizedOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE).map((order, index) => {
                    return (
                        <div key={index} className='my-orders-order'>
                            <img src={assets.parcel_icon} alt="" />
                            <div className='my-orders-order-details'>
                            <p>
                                {order.items.map((item, index) => {
                                    if (index === order.items.length - 1) {
                                        return item.name + " x " + item.quantity
                                    }
                                    else {
                                        return item.name + " x " + item.quantity + ", "
                                    }
                                })}
                            </p>
                            <p className='my-orders-order-address'>
                                {order.address?.street}, {order.address?.city}, {order.address?.state}
                            </p>
                            {order.refundNotice && !order.refundProcessed ? (
                                <p className='my-orders-refund-notice'>{order.refundNotice}</p>
                            ) : null}
                            {order.refundProcessed ? (
                                <p className='my-orders-refunded-notice'>You got the refund.</p>
                            ) : null}
                            {order.status === "Cancelled" ? (
                                <p className='my-orders-cancel-notice'>
                                    {order.cancellationReason || "Order cancelled."}
                                    {" "}Refund: Tk {order.cancellationRefundAmount || 0}
                                </p>
                            ) : null}
                            </div>
                            <p>Tk {order.amount}.00</p>
                            <p>Items: {order.items.length}</p>
                            <p><span>&#x25cf;</span> <b>{order.status}</b></p>
                            <div className='my-orders-order-macros'>
                                <span>{order.resolvedNutritionTotals.calories} kcal</span>
                                <span>P {order.resolvedNutritionTotals.protein}g</span>
                                <span>C {order.resolvedNutritionTotals.carbs}g</span>
                                <span>F {order.resolvedNutritionTotals.fat}g</span>
                            </div>
                            <div className="my-orders-actions">
                                <button onClick={() => handleOpenFeedback(order)}>
                                    {order.status === "Delivered" ? "Give Feedback" : "Track Order"}
                                </button>
                                {order.status === "Delivered" || order.deliveryStatus === "Delivered" ? (
                                    <button
                                        type="button"
                                        disabled={Boolean(order.riderReported)}
                                        onClick={() => handleReportRider(order)}
                                    >
                                        {order.riderReported ? "Rider Reported" : "Report Rider"}
                                    </button>
                                ) : null}
                                {canCancelOrder(order) ? (
                                    <button
                                        type="button"
                                        className="cancel-order-button"
                                        disabled={cancellingOrderId === order._id}
                                        onClick={() => handleCancelOrder(order)}
                                    >
                                        {cancellingOrderId === order._id ? "Cancelling..." : "Cancel Order"}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )
                })}
            </div>
            {data.length > ORDERS_PER_PAGE ? (
                <div className='pagination'>
                    <button
                        type='button'
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        type='button'
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            ) : null}
            <RatingModal
                isOpen={Boolean(selectedOrderForFeedback)}
                mode={selectedItemForReview ? "form" : "orderItems"}
                onClose={handleCloseFeedbackModal}
                onBack={() => {
                    setSelectedItemForReview(null);
                    setFeedbackNotice("");
                }}
                order={selectedOrderForFeedback}
                orderFeedbackMap={orderFeedbacks}
                onSelectReviewItem={handleSelectReviewItem}
                product={
                    selectedItemForReview
                        ? {
                              name: selectedItemForReview.name,
                              description: selectedItemForReview.description,
                              image: `${url}/images/${selectedItemForReview.image}`,
                              price: selectedItemForReview.price,
                              calories: selectedItemForReview.calories,
                              protein: selectedItemForReview.protein,
                              carbs: selectedItemForReview.carbs,
                              fat: selectedItemForReview.fat,
                          }
                        : null
                }
                formData={feedbackForm}
                onFormChange={(comment) => setFeedbackForm((prev) => ({ ...prev, comment }))}
                onRatingSelect={(rating) => setFeedbackForm((prev) => ({ ...prev, rating }))}
                onSubmit={handleSubmitFeedback}
                isSaving={isSavingFeedback}
                notice={feedbackNotice}
            />
            {selectedTrackingOrder ? (
                <div className="tracking-modal">
                    <div className="tracking-card">
                        <div className="tracking-card-header">
                            <div>
                                <h3>Live Delivery Tracking</h3>
                                <p>Order #{selectedTrackingOrder._id.slice(-6).toUpperCase()}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedTrackingOrder(null)}>x</button>
                        </div>

                        <div className="tracking-map">
                            <div className="map-point shop">
                                <strong>{selectedTrackingOrder.deliveryMeta?.kitchenHub || "Kitchen Hub"}</strong>
                                <span>{selectedTrackingOrder.deliveryMeta?.kitchenAddress || selectedTrackingOrder.address?.shopAddress || "Nearest FitFuel kitchen"}</span>
                            </div>
                            <div className="map-route-line">
                                <span className={`rider-dot ${selectedTrackingOrder.deliveryStatus === "Delivered" ? "delivered" : ""}`}></span>
                            </div>
                            <div className="map-point customer">
                                <strong>Customer</strong>
                                <span>{selectedTrackingOrder.address?.area || "Dhaka"}</span>
                            </div>
                        </div>

                        <div className="tracking-details-grid">
                            <div>
                                <span>Food Status</span>
                                <strong>{selectedTrackingOrder.status}</strong>
                            </div>
                            <div>
                                <span>Delivery Status</span>
                                <strong>{selectedTrackingOrder.deliveryStatus || "Waiting for assignment"}</strong>
                            </div>
                            <div>
                                <span>Estimated Time</span>
                                <strong>{selectedTrackingOrder.deliveryStatus === "Delivered" ? "Delivered" : selectedTrackingOrder.deliveryMeta?.estimatedDeliveryTime || "Up to 60 min"}</strong>
                            </div>
                            <div>
                                <span>Delivery Deadline</span>
                                <strong>{selectedTrackingOrder.status === "Expired" ? "Expired" : formatDeadline(selectedTrackingOrder.deliveryMeta?.deliveryDeadline)}</strong>
                            </div>
                            <div>
                                <span>Delivery Mode</span>
                                <strong>{selectedTrackingOrder.deliveryMeta?.deliveryMode || "Cooked food"}</strong>
                            </div>
                            <div>
                                <span>Kitchen Hub</span>
                                <strong>{selectedTrackingOrder.deliveryMeta?.kitchenHub || "Nearest FitFuel kitchen"}</strong>
                            </div>
                        </div>

                        <div className="tracking-rider-box">
                            <h4>Delivery Partner</h4>
                            {selectedTrackingOrder.assignedDeliveryPartner ? (
                                <p>
                                    {selectedTrackingOrder.assignedDeliveryPartner.name} | {selectedTrackingOrder.assignedDeliveryPartner.phone} | {selectedTrackingOrder.assignedDeliveryPartner.vehicleType}
                                </p>
                            ) : (
                                <p>Admin is assigning a delivery partner.</p>
                            )}
                        </div>

                        <div className="tracking-timeline">
                            <h4>Timeline</h4>
                            {(selectedTrackingOrder.deliveryTimeline || []).length ? (
                                selectedTrackingOrder.deliveryTimeline.map((entry, index) => (
                                    <div key={`${entry.label}-${index}`} className="tracking-timeline-row">
                                        <span></span>
                                        <div>
                                            <strong>{entry.label}</strong>
                                            <p>{entry.note || "Status updated"}</p>
                                            <small>{entry.time ? new Date(entry.time).toLocaleString() : ""}</small>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-tracking">Tracking will start after a delivery partner accepts the task.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default MyOrders
