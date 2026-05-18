import { log } from "console";
import foodModel from "../models/foodModel.js";
import fs from 'fs'

// Converts nutrition input from form text into a safe non-negative number.
const parseNutritionValue = (value) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

// Shelf life has a default because old products may not send this value.
const parseShelfLifeDays = (value) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 180;
};

// Adds a nutrition product from the admin panel, including uploaded image and macro values.

const addFood= async (req,res)=>{

    // Admin form values arrive as strings, so we parse and validate them first.
    const calories = parseNutritionValue(req.body.calories);
    const protein = parseNutritionValue(req.body.protein);
    const carbs = parseNutritionValue(req.body.carbs);
    const fat = parseNutritionValue(req.body.fat);
    const shelfLifeDays = parseShelfLifeDays(req.body.shelfLifeDays);

    if ([calories, protein, carbs, fat].some((value) => value === null)) {
        return res.json({ success: false, message: "Please enter valid nutrition values" });
    }

    // multer saves the uploaded file; the database stores only its filename.
    let image_filename=`${req.file.filename}`;

    const food = new foodModel({
        name:req.body.name,
        description:req.body.description,
        price:req.body.price,
        category:req.body.category,
        image:image_filename,
        quantity:req.body.quantity,
        calories,
        protein,
        carbs,
        fat,
        shelfLifeDays
        
    })
    try{

        await food.save();
        res.json({success:true,message:"Product added"})
    }catch (error){
        console.log(error)
        res.json({success:false,message:"Error"})
    }

}

// Returns all nutrition products for frontend menu/admin list pages.
const listFood = async (req,res)=>{

    try{

        const foods = await foodModel.find({});
        res.json({success:true,data:foods})
    }catch(error){
 
        console.log(error)
        res.json({success:false,message:"Error"})
    }
}

// Removes a product and also deletes its image file from the uploads folder.
const removeFood = async (req,res)=>{

     try{

        const foods = await foodModel.findById(req.body.id);
        if (!foods) {
            return res.json({ success: false, message: "Product not found" });
        }

        // Image deletion is best-effort; product deletion should still continue.
        fs.unlink(`uploads/${foods.image}`,()=>{})
        await foodModel.findByIdAndDelete(req.body.id)
        res.json({ success: true, message: "Product removed" })
    }catch(error){
 
        console.log(error)
        res.json({success:false,massage:"Error"})
    }
}

// Admin can update stock quantity without editing the full product.
const updateFoodQuantity = async (req,res) => {
    try {
        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.json({ success: false, message: "Please enter a valid quantity" });
        }

        const updatedFood = await foodModel.findByIdAndUpdate(
            req.body.id,
            { quantity },
            { new: true }
        );

        if (!updatedFood) {
            return res.json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, message: "Quantity updated", data: updatedFood });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

export {addFood,listFood,removeFood,updateFoodQuantity}
