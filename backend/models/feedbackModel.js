import mongoose from "mongoose";

// A feedback document belongs to one user, one food item, and one order.
// This makes sure people review only products they actually purchased.
const feedbackSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "food",
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "order",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
        userName: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

// One user can review the same product once per order. Re-submitting edits it.
feedbackSchema.index({ userId: 1, foodId: 1, orderId: 1 }, { unique: true });

// Reuse existing model during development hot reloads.
const feedbackModel = mongoose.models.feedback || mongoose.model("feedback", feedbackSchema);

export default feedbackModel;
