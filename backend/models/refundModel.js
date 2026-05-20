import mongoose from "mongoose";

// Stores refund history separately from orders.
// The order still keeps quick display fields, but this collection gives admin a clear refund record.
const refundSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    amount: { type: Number, required: true, default: 0 },
    percentage: { type: Number, default: 0 },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Notice Sent", "Sent"], default: "Pending" },
    processedAt: { type: Date },
}, { timestamps: true });

const refundModel = mongoose.models.refund || mongoose.model("refund", refundSchema);

export default refundModel;
