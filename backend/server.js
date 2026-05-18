import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js"
import foodRouter from "./routes/foodRoute.js"
import 'dotenv/config'
import userRouter from "./routes/userRoute.js"
import 'dotenv/config'
import cartRouter from "./routes/cartRoute.js"
import orderRouter from "./routes/orderRoute.js"
import feedbackRouter from "./routes/feedbackRoute.js"
import adminRouter from "./routes/adminRoute.js"
import deliveryPartnerRouter from "./routes/deliveryPartnerRoute.js"

// This file is the backend entry point. It creates the Express app,
// connects all route groups, then starts the server after MongoDB is ready.

// App config
const app =express()
const port =4000

// Middleware that every request passes through.
// express.json() lets the backend read JSON bodies from React/admin forms.
// cors() allows the frontend and admin apps to call this API from another port.
app.use(express.json())
app.use(cors())

// API endpoints are grouped by feature so each router stays focused.
app.use("/api/food",foodRouter)
// Uploaded product images are served from /images/<filename>.
app.use("/images",express.static('uploads'))
app.use("/api/user",userRouter) 
app.use("/api/cart",cartRouter) 
app.use("/api/order", orderRouter)
app.use("/api/feedback", feedbackRouter)
app.use("/api/admin", adminRouter)
app.use("/api/delivery", deliveryPartnerRouter)

// Small health-check route. If this works, Express is running.
app.get("/",(req,res)=>{

    res.send("API Working")

})

// The server starts only after MongoDB connects successfully.
// This prevents API requests from running before the database is available.
const startServer = async () => {
    try {
        await connectDB()
        app.listen(port,()=>{
            console.log(`server started on http://localhost:${port}`);
        })
    } catch (error) {
        console.error("Failed to connect to MongoDB.");
        console.error("Check your internet/DNS or use a valid MONGODB_URI in backend/.env.");
        console.error(error.message);
        process.exit(1);
    }
}

startServer()
