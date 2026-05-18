import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import validator from "validator"
import { sendEmail } from "../config/mailer.js";


// Logs in a normal customer by checking email/password and returning a JWT token.
const loginUser = async (req,res)=> {
	const {email,password} = req.body;
	try{
		const user = await userModel.findOne({email});
		
		if(!user){
			return res.json({success:false,message:"User Doesn't exist"})
		}	
		
		// bcrypt.compare checks the typed password against the saved hashed password.
		const isMatch = await bcrypt.compare(password,user.password);
		
		if(!isMatch){
			return res.json({success:false,message:"Invalid Password credential"})
		}
		
		const token = createToken(user._id);
		res.json({success:true,token})
		
	} catch(error){
		console.log(error);
        res.json({success:false,message:"Error"})		
    }		
}

// JWT token stores only the user id. The frontend sends this token with protected requests.
const createToken = (id) => {
	return jwt.sign({id},process.env.JWT_SECRET)
}

// Registers a new customer, validates input, hashes password, then returns a login token.
const registerUser = async (req,res) => {
    const {name,password,email}	= req.body;
	try{
		// Checking if user already exists prevents duplicate accounts with the same email.
		const exists = await userModel.findOne({email});
		if(exists){
			return res.json({success:false,message:"User already exists"})
		}
		
        // Validating email format and minimum password length before saving.
		if(!validator.isEmail(email)){
			return res.json({success:false,message:"Please enter a valid email"})
		}
		
		if(password.length<8){
			return res.json({success:false,message:"Please enter a strong password"})
		}
		
		// Passwords are never saved as plain text. Only the hash is stored.
		const salt = await bcrypt.genSalt(10)
		const hashedpassword = await bcrypt.hash(password,salt);
		
		const newUser= new userModel({
			name:name,
			email:email,
			password:hashedpassword
		})
		
		const user = await newUser.save()
		const token = createToken(user._id)
		res.json({success:true,token}); 
	}catch (error){
		console.log(error);
		res.json({success:false,message:"Error"})
	}				
} 

// Starts the password reset flow by emailing a 6-digit OTP to the user.
const forgotPassword = async (req,res) => {
	const { email } = req.body;

	try {
		if (!validator.isEmail(email || "")) {
			return res.json({ success: false, message: "Please enter a valid email" });
		}

		const user = await userModel.findOne({ email });

		if (!user) {
			return res.json({ success: false, message: "User doesn't exist" });
		}

		// OTP is short for the user, but expires quickly for safety.
		const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
		const otpExpire = Date.now() + 15 * 60 * 1000;

		user.resetOtp = otp;
		user.resetOtpExpire = otpExpire;
		await user.save();

		await sendEmail({
			to: email,
			subject: "Gym Nutrition Password Reset OTP",
			html: `
				<div style="font-family: Arial, sans-serif; line-height: 1.6;">
					<h2>Password Reset Request</h2>
					<p>Your 6-digit OTP is:</p>
					<h1 style="letter-spacing: 6px;">${otp}</h1>
					<p>This OTP will expire in 15 minutes.</p>
				</div>
			`,
		});

		res.json({ success: true, message: "OTP sent to your email" });
	} catch (error) {
		console.log(error);
		res.json({ success: false, message: error.message || "Error" });
	}
}

// Confirms that the OTP matches and is still inside the valid time window.
const verifyOTP = async (req,res) => {
	const { email, otp } = req.body;

	try {
		const user = await userModel.findOne({ email });

		if (!user) {
			return res.json({ success: false, message: "User doesn't exist" });
		}

		if (!user.resetOtp || user.resetOtp !== otp) {
			return res.json({ success: false, message: "Invalid OTP" });
		}

		if (user.resetOtpExpire < Date.now()) {
			return res.json({ success: false, message: "OTP expired" });
		}

		// After verification we mark it temporarily as VERIFIED so resetPassword can continue.
		user.resetOtp = "VERIFIED";
		user.resetOtpExpire = Date.now() + 5 * 60 * 1000;
		await user.save();

		res.json({ success: true, message: "OTP verified" });
	} catch (error) {
		console.log(error);
		res.json({ success: false, message: error.message || "Error" });
	}
}

// Final step of password reset: replace old password with a new hashed password.
const resetPassword = async (req,res) => {
	const { email, newPassword } = req.body;

	try {
		const user = await userModel.findOne({ email });

		if (!user) {
			return res.json({ success: false, message: "User doesn't exist" });
		}

		if (user.resetOtp !== "VERIFIED" || user.resetOtpExpire < Date.now()) {
			return res.json({ success: false, message: "Please verify your OTP first" });
		}

		if (!newPassword || newPassword.length < 8) {
			return res.json({ success: false, message: "Please enter a strong password" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedpassword = await bcrypt.hash(newPassword,salt);

		user.password = hashedpassword;
		user.resetOtp = "";
		user.resetOtpExpire = 0;
		await user.save();

		res.json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log(error);
		res.json({ success: false, message: error.message || "Error" });
	}
}
		
export {loginUser,registerUser,forgotPassword,verifyOTP,resetPassword}  
	
