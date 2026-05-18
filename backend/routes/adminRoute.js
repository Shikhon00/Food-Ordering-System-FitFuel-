import express from "express";
import { loginAdmin, updateAdminProfile } from "../controllers/adminController.js";

const adminRouter = express.Router();

// Admin authentication/profile routes for the admin dashboard.
adminRouter.post("/login", loginAdmin);
adminRouter.post("/profile", updateAdminProfile);

export default adminRouter;
