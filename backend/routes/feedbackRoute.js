import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
    addOrUpdateFeedback,
    getFoodFeedback,
    getUserOrderFeedback,
} from "../controllers/feedbackController.js";

const feedbackRouter = express.Router();

// Feedback submit/order routes are protected; product feedback is public for display.
feedbackRouter.post("/submit", authMiddleware, addOrUpdateFeedback);
feedbackRouter.get("/food/:foodId", getFoodFeedback);
feedbackRouter.get("/order/:orderId", authMiddleware, getUserOrderFeedback);

export default feedbackRouter;
