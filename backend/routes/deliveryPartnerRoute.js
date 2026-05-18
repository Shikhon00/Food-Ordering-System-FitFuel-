import express from "express";
import deliveryAuth from "../middleware/deliveryAuth.js";
import {
    approveDeliveryPartner,
    claimDeliveryTask,
    getDeliveryProfile,
    getDeliveryTasks,
    listDeliveryPartners,
    loginDeliveryPartner,
    registerDeliveryPartner,
    rejectDeliveryTask,
    updateAvailability,
    updateDeliveryStatus,
} from "../controllers/deliveryPartnerController.js";

const deliveryPartnerRouter = express.Router();

// Public rider auth routes.
deliveryPartnerRouter.post("/register", registerDeliveryPartner);
deliveryPartnerRouter.post("/login", loginDeliveryPartner);
// Admin rider management routes.
deliveryPartnerRouter.get("/admin/list", listDeliveryPartners);
deliveryPartnerRouter.post("/admin/approve", approveDeliveryPartner);
// Rider panel routes. deliveryAuth attaches partnerId from the JWT.
deliveryPartnerRouter.post("/profile", deliveryAuth, getDeliveryProfile);
deliveryPartnerRouter.post("/availability", deliveryAuth, updateAvailability);
deliveryPartnerRouter.post("/tasks", deliveryAuth, getDeliveryTasks);
deliveryPartnerRouter.post("/claim", deliveryAuth, claimDeliveryTask);
deliveryPartnerRouter.post("/reject", deliveryAuth, rejectDeliveryTask);
deliveryPartnerRouter.post("/status", deliveryAuth, updateDeliveryStatus);

export default deliveryPartnerRouter;
