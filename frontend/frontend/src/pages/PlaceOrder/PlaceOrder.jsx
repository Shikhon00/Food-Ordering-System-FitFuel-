import React, {  useState } from 'react'
import './PlaceOrder.css'
import { useContext} from 'react'
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const BANGLADESH_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

// Checkout page collects delivery information and starts Stripe payment.
const PlaceOrder = () => {
const {getTotalCartAmount,token,food_list,cartItems,url,fetchFoodList,cancelPendingCheckout}=useContext(StoreContext)

// Delivery form state. city/country/shopAddress are added when building the order payload.
const [data,setData] = useState({
  firstName:"",
  lastName:"",
  email:"",
  division:"Dhaka",
  area:"",
  street:"",
  landmark:"",
  phone:""
})

// Generic input handler so every input can update the same form object.
const onChangeHandler = (event)=>{
  const name = event.target.name;
  const value = event.target.value;
  setData(data=>({...data,[name]:value}))
}

  const placeOrder = async (event)=>{

    event.preventDefault();
    let orderItems = [];
    // Convert cart object into a real item array with quantity for backend.
    food_list.map((item)=>{
      if(cartItems[item._id] > 0) {
let itemInfo={...item};
 itemInfo["quantity"] =cartItems[item._id];
orderItems.push(itemInfo);
      }
    })

    // Backend receives address, selected items, and total amount.
    let orderData = {
      address:{
        ...data,
        city:data.division,
        country:"Bangladesh",
        shopAddress:"FitFuel Packing Hub, Uttara Sector 10, Dhaka"
      },
      items:orderItems,
      amount:getTotalCartAmount()+60,
    }
    let response = await axios.post(url+"/api/order/place",orderData,{headers:{token}})
    if(response.data.success){
const {session_url}=response.data;
// Save pending order info so abandoned Stripe checkout can be cleaned up later.
localStorage.setItem("pendingCheckoutOrderId", response.data.orderId);
localStorage.setItem("pendingCheckoutStartedAt", String(Date.now()));
sessionStorage.setItem("pendingCheckoutRedirecting", "true");
sessionStorage.removeItem("pendingCheckoutLeftPage");
window.location.replace(session_url)
    }
    else{
      alert(response.data.message || "Unable to place order")
    }
  }


  const navigate = useNavigate();
  useEffect(()=>{
    // If a previous checkout was left unfinished, cancel it before placing another order.
    const settlePendingCheckout = async () => {
      const pendingOrderId = localStorage.getItem("pendingCheckoutOrderId");

      if (!pendingOrderId) {
        return;
      }

      const response = await cancelPendingCheckout(true);
      await fetchFoodList();
      if (!response) {
        return;
      }
      navigate("/cart");
    };

    settlePendingCheckout();

    // Users cannot open checkout without login or cart items.
    if(!token){
      navigate('/cart')
    }else if(getTotalCartAmount()===0){

      navigate('/cart')
    }
  },[token])

  return (
    <form onSubmit={placeOrder} className='place-order'>
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="shop-origin-box">
          <span>Package Pickup</span>
          <strong>FitFuel Packing Hub, Uttara Sector 10, Dhaka</strong>
        </div>
        <div className="multi-fields">
          <input required name='firstName' onChange={onChangeHandler} value={data.firstName}  type="text" placeholder='First name' />
          <input required name='lastName' onChange={onChangeHandler} value={data.lastName}  type="text" placeholder='Last name' />
        </div>
        <input required name='email' onChange={onChangeHandler} value={data.email} type="email" placeholder='Email address' />
        <select required name='division' onChange={onChangeHandler} value={data.division}>
          {BANGLADESH_DIVISIONS.map((division) => (
            <option key={division} value={division}>{division}</option>
          ))}
        </select>
        <p className="delivery-mode-note">
          Packed nutrition products can be delivered in Dhaka and outside Dhaka.
        </p>
        <input required name='area' onChange={onChangeHandler} value={data.area} type="text" placeholder='Area or city, e.g. Banani, Rajshahi Sadar' />
        <input required name='street' onChange={onChangeHandler} value={data.street} type="text" placeholder='Road, house, flat details' />
        <input name='landmark' onChange={onChangeHandler} value={data.landmark} type="text" placeholder='Nearby landmark (optional)' />
        <input required name='phone' onChange={onChangeHandler} value={data.phone} type="text" placeholder='Phone' />
      </div>

      <div className="place-order-right">
        <div className="cart-total">
          <h2>Nutrition Order Summary</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>Tk { getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>Tk { getTotalCartAmount()===0?0:60}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>Total</b>
              <b>Tk {getTotalCartAmount()===0?0:getTotalCartAmount()+60}</b>
            </div>
          </div>
          <button type='submit'>PROCEED TO PAYMENT</button>
        </div>
      </div>
    </form>
  )
}

export default PlaceOrder
