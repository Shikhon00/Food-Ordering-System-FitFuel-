import mongoose from "mongoose";

// Single admin login record. The controller creates a default admin if this is empty.
const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

// Reuse existing model during development hot reloads.
const adminModel = mongoose.models.admin || mongoose.model("admin", adminSchema);

export default adminModel;
