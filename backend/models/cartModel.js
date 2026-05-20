import mongoose from "mongoose";

// One cart document belongs to one user.
// items keeps the same simple shape the frontend already uses: { foodId: quantity }.
const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, unique: true },
    items: { type: Object, default: {} },
}, { minimize: false, timestamps: true });

const cartModel = mongoose.models.cart || mongoose.model("cart", cartSchema);

export default cartModel;
