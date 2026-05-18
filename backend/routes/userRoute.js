import express from "express"
import {loginUser,registerUser,forgotPassword,verifyOTP,resetPassword} from "../controllers/userController.js"

const userRouter = express.Router()

// Customer authentication and forgot-password routes.
userRouter.post("/register",registerUser)
userRouter.post("/login",loginUser)
userRouter.post("/forgot-password",forgotPassword)
userRouter.post("/verify-otp",verifyOTP)
userRouter.post("/reset-password",resetPassword)

export default userRouter;    
