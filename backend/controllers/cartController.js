import userModel from "../models/userModel.js"
import foodModel from "../models/foodModel.js"
import cartModel from "../models/cartModel.js"

// Gets or creates the user's cart collection document.
// Old users may still have cartData inside user, so we copy it once as a fallback.
const getUserCart = async (userId) => {
	let cart = await cartModel.findOne({ userId });

	if (!cart) {
		const user = await userModel.findById(userId);
		cart = await cartModel.create({
			userId,
			items: user?.cartData || {},
		});
	}

	return cart;
}

// Keeps the old user.cartData field synced so existing frontend code keeps working.
const syncUserCartData = async (userId, items) => {
	await userModel.findByIdAndUpdate(userId, { cartData: items });
}

// Adds one quantity of a product to the logged-in user's cart.
const addToCart = async (req,res) => {
	try{
		// We check current stock before increasing cart quantity.
		const foodItem = await foodModel.findById(req.body.itemId);
		if(!foodItem){
			return res.json({success:false,message:"Item not found"})
		}

		// Cart items are stored as { foodId: quantity }.
		const cart = await getUserCart(req.body.userId);
		let cartData = cart.items || {};
		const currentQuantity = cartData[req.body.itemId] || 0;

		if(currentQuantity >= foodItem.quantity){
			return res.json({success:false,message:"Maximum available quantity reached"});
		}

		cartData[req.body.itemId] = currentQuantity + 1;

		cart.items = cartData;
		await cart.save();
		await syncUserCartData(req.body.userId, cartData);
		res.json({success:true,message:"Added To Cart"});
	} catch(error) {
		console.log(error);
		res.json({success:false,message:"Error"})
	}
}

// Removes one quantity from the user's cart.
const removeFromCart = async (req,res) => {
	try{
		const cart = await getUserCart(req.body.userId);
		let cartData = cart.items || {};
		if(cartData[req.body.itemId]>0) {
			cartData[req.body.itemId] -=1;
		}

		if (cartData[req.body.itemId] <= 0) {
			delete cartData[req.body.itemId];
		}

		cart.items = cartData;
		await cart.save();
		await syncUserCartData(req.body.userId, cartData);
		res.json({success:true,message:"Removed From Cart"})
	} catch (error) {
		console.log(error);
		res.json({success:false,message:"Error"})
		
	}
}

// Sends the saved cart object back to the frontend after login/refresh.
const getCart = async (req,res) => {
	try{
		const cart = await getUserCart(req.body.userId);
		let cartData = cart.items || {};
		await syncUserCartData(req.body.userId, cartData);
		res.json({success:true,cartData})
	} catch (error) {
		console.log(error);
		res.json({success:false,message:"Error"})
	}
}

export {addToCart,removeFromCart,getCart}
