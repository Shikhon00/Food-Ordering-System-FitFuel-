import mongoose from "mongoose";
import feedbackModel from "../models/feedbackModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";

// Feedback routes receive MongoDB ids from the frontend, so we validate them first.
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Makes sure a customer can only review products that were actually in that order.
const getOrderItemByFoodId = (order, foodId) =>
    (order?.items || []).find((item) => String(item._id) === String(foodId));

// Creates or updates a review for one product inside one delivered order.
const addOrUpdateFeedback = async (req, res) => {
    const { userId, foodId, orderId, rating, comment } = req.body;

    try {
        if (!isValidObjectId(userId) || !isValidObjectId(foodId) || !isValidObjectId(orderId)) {
            return res.json({ success: false, message: "Invalid feedback request" });
        }

        // Rating and comment are normalized before saving so the database stays clean.
        const numericRating = Number(rating);
        const trimmedComment = String(comment || "").trim();

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.json({ success: false, message: "Rating must be between 1 and 5" });
        }

        if (!trimmedComment) {
            return res.json({ success: false, message: "Comment cannot be empty" });
        }

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (String(order.userId) !== String(userId)) {
            return res.json({ success: false, message: "You cannot review this order" });
        }

        if (order.status !== "Delivered") {
            return res.json({ success: false, message: "Feedback is only available for delivered orders" });
        }

        const orderedItem = getOrderItemByFoodId(order, foodId);

        if (!orderedItem) {
            return res.json({ success: false, message: "This item does not belong to the selected order" });
        }

        const user = await userModel.findById(userId).select("name");
        const updatePayload = {
            rating: numericRating,
            comment: trimmedComment,
            userName: user?.name || "FitFuel Member",
        };

        // upsert means: update an existing review, or insert one if it does not exist.
        const feedback = await feedbackModel.findOneAndUpdate(
            { userId, foodId, orderId },
            { $set: updatePayload },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({
            success: true,
            message: "Feedback saved successfully",
            data: feedback,
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Public product feedback used by product cards/detail display.
const getFoodFeedback = async (req, res) => {
    const { foodId } = req.params;

    try {
        if (!isValidObjectId(foodId)) {
            return res.json({ success: true, averageRating: 0, totalReviews: 0, feedbacks: [] });
        }

        const feedbacks = await feedbackModel
            .find({ foodId })
            .select("rating comment userName createdAt")
            .sort({ createdAt: -1 });

        // Average rating is calculated from all saved reviews for this product.
        const totalReviews = feedbacks.length;
        const averageRating =
            totalReviews > 0
                ? Number(
                      (
                          feedbacks.reduce((sum, feedback) => sum + Number(feedback.rating || 0), 0) / totalReviews
                      ).toFixed(1)
                  )
                : 0;

        res.json({
            success: true,
            averageRating,
            totalReviews,
            feedbacks,
        });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// Loads current user's reviews for a specific order so the modal can show edit status.
const getUserOrderFeedback = async (req, res) => {
    const { userId } = req.body;
    const { orderId } = req.params;

    try {
        if (!isValidObjectId(userId) || !isValidObjectId(orderId)) {
            return res.json({ success: false, message: "Invalid request" });
        }

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (String(order.userId) !== String(userId)) {
            return res.json({ success: false, message: "You cannot access this order feedback" });
        }

        const feedbacks = await feedbackModel
            .find({ userId, orderId })
            .select("foodId orderId rating comment userName createdAt updatedAt");

        res.json({ success: true, feedbacks });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

export { addOrUpdateFeedback, getFoodFeedback, getUserOrderFeedback };
