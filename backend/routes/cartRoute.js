import express from "express"

import authMiddleware from "../middleware/auth.js"
import { addToCart, getCart, removeFromCart } from "../controllers/cartController.js";

const cartRouter = express.Router();

// Cart routes are protected, so each request belongs to the logged-in user.
cartRouter.post("/add",authMiddleware,addToCart)
cartRouter.post("/remove",authMiddleware,removeFromCart)
cartRouter.post("/get",authMiddleware,getCart)

export default cartRouter;
