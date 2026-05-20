import mongoose from "mongoose"

// Customer account. cartData is now a backup mirror of the separate carts collection.
// resetOtp fields are used only during forgot-password flow.
const userSchema = new mongoose.Schema({
	name:{type:String,required:true},
	email:{type:String,required:true,unique:true},
	password:{type:String,required:true},
	cartData: { type: Object, default: {} },
	resetOtp: { type: String, default: "" },
	resetOtpExpire: { type: Number, default: 0 }

// minimize:false keeps empty cartData objects instead of removing them from MongoDB.
},{minimize:false}) 

// Reuse model during development reloads.
const userModel = mongoose.models.user || mongoose.model("user",userSchema);
export default userModel;
