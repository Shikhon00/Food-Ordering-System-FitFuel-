import mongoose from "mongoose"

// Food schema for the cooked meal menu. Along with price/category, each item
// stores stock quantity and macro values used in order history charts.
const foodSchema =new mongoose.Schema({
    name: {type: String,required:true},
    description: {type: String,required:true},
    price: {type: Number,required:true},
    image: {type: String,required:true},
    category: {type: String,required:true},
    quantity: {type: Number,required:true},
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    shelfLifeDays: { type: Number, default: 1 },
})

// Reuse existing model during dev hot reloads.
const foodModel = mongoose.models.food || mongoose.model("food",foodSchema)
export default foodModel
