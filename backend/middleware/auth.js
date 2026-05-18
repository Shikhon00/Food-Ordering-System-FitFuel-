import jwt from "jsonwebtoken"

// Protects customer-only routes. The frontend sends a JWT token in headers,
// and this middleware adds userId to req.body for the controller to use.
const authMiddleware = async (req,res,next) => {
	const {token} = req.headers;
	if(!token) {
		return res.json ({success:false,message:"Not Authorized Login Again"})
	}
	try{
		const token_decode = jwt.verify(token,process.env.JWT_SECRET);
		// Controllers can trust req.body.userId because it came from the signed token.
		req.body = req.body || {};
		req.body.userId = token_decode.id;
		next();
	} catch(error) {
		console.log(error);
		res.json({success:false,message:"Error"})
	}
}

export default authMiddleware;
