
import './Add.css'
import { assets } from '../../assets'
import { useState } from 'react'
import axios from "axios"
import { toast } from 'react-toastify'


// Admin food creation form. It sends image + text fields as FormData.
const Add = ({url}) => {

    

    const [image,setImage] =useState(false)
    const [data,setData]=useState({name:"",
        description:"",
        price:"",
        quantity:"",
        calories:"",
        protein:"",
        carbs:"",
        fat:"",
        shelfLifeDays:"1",
        category:"Rice Meals"})

    const foodCategories = [
        "Breakfast Meals",
        "Rice Meals",
        "Chicken Meals",
        "Beef Meals",
        "Fish Meals",
        "Vegetarian Meals",
        "Snacks",
        "Drinks",
        "Meal Bundles",
        "new meal",
    ];

    // One handler updates all text/number/select inputs.
    const onChangeHandler = (event) =>{
        const name = event.target.name;
        const value = event.target.value;
        setData(data=>({...data,[name]:value}))
    }   

    // Builds multipart form data because food image is a file upload.
    const onSubmitHandler =async(event)=>{
        event.preventDefault(); 
        const formData = new FormData();
        formData.append("name",data.name)
        formData.append("description",data.description)
        formData.append("price",Number(data.price))
        formData.append("quantity",Number(data.quantity))
        formData.append("calories",Number(data.calories))
        formData.append("protein",Number(data.protein))
        formData.append("carbs",Number(data.carbs))
        formData.append("fat",Number(data.fat))
        formData.append("shelfLifeDays",Number(data.shelfLifeDays || 1))
        formData.append("category",data.category)
        formData.append("image",image)
        const response = await axios.post(`${url}/api/food/add`,formData);
        if (response.data.success){

            setData({
                 name:"",
                 description:"",
                 price:"",
                 quantity:"",
                 calories:"",
                 protein:"",
                 carbs:"",
                 fat:"",
                 shelfLifeDays:"1",
                 category:"Rice Meals"
            })
            setImage(false)
            toast.success(response.data.message)
        }else{
            toast.error(response.data.message)
        }
    }


 
  return (
    <div className='add'>
        <form className='flex-col' onSubmit={onSubmitHandler}>
            <h2>Add Cooked Food</h2>
            <div className='add-img-upload flex-col'>
                <p>Upload Image</p>
                <label htmlFor="image">
                    <img src={image?URL.createObjectURL(image):assets.upload_area} alt="" />
                </label>
                <input onChange={(e)=>setImage(e.target.files[0])} type="file" id='image' hidden required />
            </div>

            <div className='add-product-name flex-col'>
                <p>Food name</p>
                <input onChange={onChangeHandler} value={data.name} type="text" name='name' placeholder='Type food name'/>
            </div>

            <div className='add-product-description flex-col'>
                <p>Food description</p>
                <textarea onChange={onChangeHandler} value={data.description} name="description"  rows="6" placeholder='Highlight ingredients, taste, portion, and nutrition'></textarea>
            </div>

            <div className="add-category-price"> 
                <div className="add-category flex-col">
              <p>Food category</p>
              <select onChange={onChangeHandler} value={data.category} name="category" >
                {foodCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
                
              </select>
                </div>
                 <div className='add-price flex-col'>
                <p>Food price</p>
                <input onChange={onChangeHandler} value={data.price} type="Number" name='price' placeholder='TK 450'/>
            </div>
            <div className='add-price flex-col'>
                <p>Available quantity</p>
                <input onChange={onChangeHandler} value={data.quantity} type="number" name='quantity' placeholder='10'/>
            </div>
            </div>
            <div className="add-category-price">
                <div className='add-price flex-col'>
                    <p>Calories</p>
                    <input onChange={onChangeHandler} value={data.calories} type="number" name='calories' placeholder='520'/>
                </div>
                <div className='add-price flex-col'>
                    <p>Protein (g)</p>
                    <input onChange={onChangeHandler} value={data.protein} type="number" name='protein' placeholder='42'/>
                </div>
                <div className='add-price flex-col'>
                    <p>Carbs (g)</p>
                    <input onChange={onChangeHandler} value={data.carbs} type="number" name='carbs' placeholder='38'/>
                </div>
                <div className='add-price flex-col'>
                    <p>Fat (g)</p>
                    <input onChange={onChangeHandler} value={data.fat} type="number" name='fat' placeholder='16'/>
                </div>
                <div className='add-price flex-col'>
                    <p>Best Within (days)</p>
                    <input onChange={onChangeHandler} value={data.shelfLifeDays} type="number" name='shelfLifeDays' placeholder='1'/>
                </div>
            </div>
            <button type='submit' className='add-btn'>Add Food</button>

        </form>
    </div>
  )
}

export default Add
