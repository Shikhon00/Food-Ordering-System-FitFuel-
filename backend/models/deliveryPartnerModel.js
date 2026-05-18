import mongoose from "mongoose";

// Delivery partner accounts are separate from customer accounts because riders
// have approval status, availability, active task, and warning/report history.
const deliveryPartnerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        phone: { type: String, required: true },
        vehicleType: { type: String, default: "Bike" },
        status: { type: String, default: "Pending Approval" },
        availability: { type: String, default: "Offline" },
        currentOrderId: { type: String, default: "" },
        lastKnownLocation: { type: String, default: "Uttara Sector 10" },
        warningCount: { type: Number, default: 0 },
        failedDeliveries: { type: Number, default: 0 },
        reportCount: { type: Number, default: 0 },
        lastWarningReason: { type: String, default: "" },
    },
    { timestamps: true }
);

// Reuse existing model during development hot reloads.
const deliveryPartnerModel =
    mongoose.models.deliveryPartner ||
    mongoose.model("deliveryPartner", deliveryPartnerSchema);

export default deliveryPartnerModel;
