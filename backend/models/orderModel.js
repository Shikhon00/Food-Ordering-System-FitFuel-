import mongoose from "mongoose";

// Nutrition is stored inside each order so the user's history still works even
// if the product nutrition values are edited later.
const nutritionSchema = new mongoose.Schema(
    {
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
    },
    { _id: false }
);

// This schema is the main record for checkout, payment, delivery tracking,
// customer feedback/reporting, and admin refund notices.
const orderSchema = new mongoose.Schema({
    // Basic order ownership and checkout details.
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    nutritionTotals: { type: nutritionSchema, default: () => ({}) },
    address: { type: Object, required: true },
    // status is the food/order status; paymentStatus tracks Stripe payment.
    status: { type: String, default: "Food Processing" },
    paymentStatus: { type: String, default: "Pending" },
    date: { type: Date, default: Date.now },
    payment: { type: Boolean, default: false },
    confirmationEmailSent: { type: Boolean, default: false },
    // These fields help undo or explain cancelled/failed orders.
    cancellationReason: { type: String, default: "" },
    cancellationRefundPercentage: { type: Number, default: 0 },
    cancellationRefundAmount: { type: Number, default: 0 },
    cancelledAt: { type: Date },
    stockRestored: { type: Boolean, default: false },
    // Delivery assignment and timeline fields power customer tracking/admin review.
    assignedDeliveryPartner: { type: Object, default: null },
    deliveryStatus: { type: String, default: "Waiting for assignment" },
    deliveryTimeline: { type: Array, default: [] },
    deliveryReviewRequired: { type: Boolean, default: false },
    deliveryIssueReason: { type: String, default: "" },
    deliveryFailedAt: { type: Date },
    // Customer can report a rider after a delivered order.
    riderReported: { type: Boolean, default: false },
    riderReportReason: { type: String, default: "" },
    riderReportedAt: { type: Date },
    // Admin can send a short refund notice back to the customer.
    refundNotice: { type: String, default: "" },
    refundNoticeAt: { type: Date },
    refundProcessed: { type: Boolean, default: false },
    refundProcessedAt: { type: Date }
})

// Reuse an existing model during development hot reloads to avoid overwrite errors.
const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
