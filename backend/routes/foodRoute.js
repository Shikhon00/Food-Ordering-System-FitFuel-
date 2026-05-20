import  express from 'express';
import { addFood ,listFood,removeFood, updateFoodQuantity} from '../controllers/foodController.js';
import multer from 'multer';

const foodRouter =express.Router()

// multer saves uploaded food images in backend/uploads.
const storage = multer.diskStorage({
    destination:"uploads",

    filename:(req,file,cb)=>{
        return cb(null,`${Date.now()}${file.originalname}`)
    }
})

const upload =multer({storage:storage})

// Food management routes used by admin, plus public food listing.
foodRouter.post("/add",upload.single("image"),addFood)
foodRouter.get("/list",listFood)
foodRouter.post("/remove",removeFood)
foodRouter.post("/update-quantity",updateFoodQuantity)

export default foodRouter;
