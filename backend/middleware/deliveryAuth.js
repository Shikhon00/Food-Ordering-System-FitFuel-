import jwt from "jsonwebtoken";

// Same idea as customer auth, but for delivery partners.
// It places partnerId on req.body after verifying the JWT.
const deliveryAuth = async (req, res, next) => {
    const { token } = req.headers;

    if (!token) {
        return res.json({ success: false, message: "Please login as a delivery partner" });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        // Controller functions use partnerId to load the logged-in rider.
        req.body = req.body || {};
        req.body.partnerId = decodedToken.id;
        next();
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Delivery login expired. Please login again." });
    }
};

export default deliveryAuth;
