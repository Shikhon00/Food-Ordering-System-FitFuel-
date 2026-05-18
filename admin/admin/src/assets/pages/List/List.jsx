import React, { useEffect, useState } from 'react'
import './List.css'
import axios from 'axios'
import {toast} from "react-toastify"

// Admin inventory page for viewing products, editing stock, and removing products.
const List = ({url}) => {

  
  const [list,setList] =useState([])
  const [editedQuantities,setEditedQuantities] = useState({})


  // Loads product list and prepares editable stock values for each product.
  const fetchList = async()=>{
  const response = await axios.get(`${url}/api/food/list`)
  
  if(response.data.success){
    setList(response.data.data)
    const quantityMap = {};
    response.data.data.forEach((item) => {
      quantityMap[item._id] = item.quantity ?? 0;
    });
    setEditedQuantities(quantityMap)
  }else{
    toast.error("Error")
  }
  }

  // Removes a product from database and refreshes the list.
  const removeFood = async(foodId) =>{
    const response = await axios.post(`${url}/api/food/remove`,{id:foodId})
    await fetchList()
  
  if(response.data.message){
    toast.success(response.data.message)
  }else {
    toast.error("Error")
  }
  }

  // Keeps unsaved stock edits locally before Save is clicked.
  const handleQuantityChange = (foodId, value) => {
    setEditedQuantities((prev) => ({
      ...prev,
      [foodId]: value
    }));
  };

  // Saves one product's stock quantity to backend.
  const updateQuantity = async (foodId) => {
    const rawQuantity = editedQuantities[foodId];

    if (rawQuantity === "" || Number(rawQuantity) < 0 || !Number.isInteger(Number(rawQuantity))) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const response = await axios.post(`${url}/api/food/update-quantity`, {
      id: foodId,
      quantity: Number(rawQuantity),
    });

    if (response.data.success) {
      toast.success(response.data.message);
      await fetchList();
    } else {
      toast.error(response.data.message || "Error");
    }
  };

  useEffect(()=>{
    fetchList();
  },[])
  
  return (
    <div className='list add flex-col'>
      <p>Product inventory</p>
      <div className="list-table">
      <div className="list-table-format title">
        <b>Image</b>
        <b>Product</b>
        <b>Category</b>
        <b>Price</b>
        <b>Macros</b>
        <b>Stock</b>
        <b>Action</b>
      </div>

      {
        list.map((item)=>{
          return(
            <div key={item._id} className="list-table-format">
          <img src={`${url}/images/`+item.image} alt="" />
          <p>{item.name}</p>
          <p>{item.category}</p>
          <p>Tk {item.price}</p>
          <p>{item.calories} kcal | P {item.protein}g | C {item.carbs}g | F {item.fat}g | Shelf Life: {item.shelfLifeDays || 180} days</p>
          <div className="list-quantity-control">
            <input
              type="number"
              min="0"
              value={editedQuantities[item._id] ?? ""}
              onChange={(event) => handleQuantityChange(item._id, event.target.value)}
            />
            <button onClick={() => updateQuantity(item._id)} type="button">
              Save
            </button>
          </div>
          <p onClick={()=> removeFood(item._id)} className="cursor">X</p>
              </div>
          )

        })
      }
  
      </div>

    </div>
  )
}

export default List
