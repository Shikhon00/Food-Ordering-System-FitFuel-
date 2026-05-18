import express from "express"
import authMiddleware from "../middleware/auth.js"
import { placeOrder ,verifyOrder,userOrders, listOrders, updateStatus, assignDeliveryPartner, reportRider, sendRefundNotice, getDashboardData, downloadReport} from "../controllers/orderController.js"

const orderRouter = express.Router();

// Customer checkout and payment verification.
orderRouter.post("/place", authMiddleware, placeOrder);
orderRouter.post("/verify",verifyOrder);
// Customer/admin order views.
orderRouter.post("/userOrders", authMiddleware,userOrders);
orderRouter.get("/list", listOrders);
// Admin operations: status updates, rider assignment, refund notice, dashboard, reports.
orderRouter.post("/status", updateStatus);
orderRouter.post("/assign-delivery", assignDeliveryPartner);
orderRouter.post("/report-rider", authMiddleware, reportRider);
orderRouter.post("/refund-notice", sendRefundNotice);
orderRouter.get("/dashboard", getDashboardData);
orderRouter.get("/report", downloadReport);

export default orderRouter;
