import userModel from "../models/userModel.js"
import foodModel from "../models/foodModel.js"

// Adds one quantity of a product to the logged-in user's cart.
const addToCart = async (req,res) => {
	try{
		// We check current stock before increasing cart quantity.
		const foodItem = await foodModel.findById(req.body.itemId);
		if(!foodItem){
			return res.json({success:false,message:"Item not found"})
		}

		// cartData is stored on the user as { productId: quantity }.
		let userData = await userModel.findById(req.body.userId);
		let cartData = await userData.cartData;
		const currentQuantity = cartData[req.body.itemId] || 0;

		if(currentQuantity >= foodItem.quantity){
			return res.json({success:false,message:"Maximum available quantity reached"});
		}

		cartData[req.body.itemId] = currentQuantity + 1;

		await userModel.findByIdAndUpdate(req.body.userId,{cartData});
		res.json({success:true,message:"Added To Cart"});
	} catch(error) {
		console.log(error);
		res.json({success:false,message:"Error"})
	}
}

// Removes one quantity from the user's cart.
const removeFromCart = async (req,res) => {
	try{
		let userData = await userModel.findById(req.body.userId);
		let cartData = await userData.cartData;
		if(cartData[req.body.itemId]>0) {
			cartData[req.body.itemId] -=1;
		}
		await userModel.findByIdAndUpdate(req.body.userId,{cartData});
		res.json({success:true,message:"Removed From Cart"})
	} catch (error) {
		console.log(error);
		res.json({success:false,message:"Error"})
		
	}
}

// Sends the saved cart object back to the frontend after login/refresh.
const getCart = async (req,res) => {
	try{
		let userData = await userModel.findById(req.body.userId);
		let cartData = await userData.cartData;
		res.json({success:true,cartData})
	} catch (error) {
		console.log(error);
		res.json({success:false,message:"Error"})
	}
}

export {addToCart,removeFromCart,getCart}
