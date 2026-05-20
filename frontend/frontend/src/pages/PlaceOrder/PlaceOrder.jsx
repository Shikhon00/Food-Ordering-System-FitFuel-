import React, {  useState } from 'react'
import './PlaceOrder.css'
import { useContext} from 'react'
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const DELIVERY_ZONES = [
  {
    zoneName: "Uttara Zone",
    hubAddress: "FitFuel Uttara Kitchen Hub, Sector 10, Uttara, Dhaka",
    eta: "30-45 min",
    areas: ["Uttara", "Airport", "Khilkhet", "Nikunja", "Dakshinkhan", "Azampur", "Abdullahpur", "Turag"],
  },
  {
    zoneName: "Mirpur Zone",
    hubAddress: "FitFuel Mirpur Kitchen Hub, Mirpur 10, Dhaka",
    eta: "30-50 min",
    areas: ["Mirpur", "Pallabi", "Kazipara", "Shewrapara", "Kallyanpur", "Agargaon", "Shyamoli", "Gabtoli"],
  },
  {
    zoneName: "Dhanmondi Zone",
    hubAddress: "FitFuel Dhanmondi Kitchen Hub, Dhanmondi 27, Dhaka",
    eta: "30-50 min",
    areas: ["Dhanmondi", "Mohammadpur", "Lalmatia", "Kalabagan", "Farmgate", "Green Road", "Panthapath", "Tejgaon"],
  },
  {
    zoneName: "Gulshan-Badda Zone",
    hubAddress: "FitFuel Gulshan Kitchen Hub, Gulshan 1, Dhaka",
    eta: "35-55 min",
    areas: ["Gulshan", "Banani", "Baridhara", "Bashundhara", "Badda", "Rampura", "Aftabnagar", "Mohakhali"],
  },
  {
    zoneName: "Motijheel-Wari Zone",
    hubAddress: "FitFuel Motijheel Kitchen Hub, Motijheel, Dhaka",
    eta: "40-60 min",
    areas: ["Motijheel", "Paltan", "Wari", "Jatrabari", "Old Dhaka", "Malibagh", "Shantinagar", "Khilgaon"],
  },
];

// Checkout page collects delivery information and starts Stripe payment.
const PlaceOrder = () => {
const {getTotalCartAmount,token,food_list,cartItems,url,fetchFoodList,cancelPendingCheckout}=useContext(StoreContext)

// Delivery form state. Cooked food only supports listed Dhaka zones/areas.
const [data,setData] = useState({
  firstName:"",
  lastName:"",
  email:"",
  deliveryZone:DELIVERY_ZONES[0].zoneName,
  area:DELIVERY_ZONES[0].areas[0],
  street:"",
  landmark:"",
  phone:""
})

// Generic input handler so every input can update the same form object.
const onChangeHandler = (event)=>{
  const name = event.target.name;
  const value = event.target.value;

  // When the zone changes, move the area to the first area in that zone.
  if (name === "deliveryZone") {
    const nextZone = DELIVERY_ZONES.find((zone) => zone.zoneName === value);
    setData(data=>({...data, deliveryZone:value, area:nextZone?.areas[0] || ""}))
    return;
  }

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

    const selectedZone = DELIVERY_ZONES.find((zone) => zone.zoneName === data.deliveryZone);

    // Backend receives address, selected food items, and total amount.
    let orderData = {
      address:{
        ...data,
        city:"Dhaka",
        division:"Dhaka",
        country:"Bangladesh",
        shopAddress:selectedZone?.hubAddress || ""
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

  const selectedZone = DELIVERY_ZONES.find((zone) => zone.zoneName === data.deliveryZone) || DELIVERY_ZONES[0];

  return (
    <form onSubmit={placeOrder} className='place-order'>
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="shop-origin-box">
          <span>Kitchen Pickup</span>
          <strong>{selectedZone.hubAddress}</strong>
          <small>Estimated delivery: {selectedZone.eta}</small>
        </div>
        <div className="multi-fields">
          <input required name='firstName' onChange={onChangeHandler} value={data.firstName}  type="text" placeholder='First name' />
          <input required name='lastName' onChange={onChangeHandler} value={data.lastName}  type="text" placeholder='Last name' />
        </div>
        <input required name='email' onChange={onChangeHandler} value={data.email} type="email" placeholder='Email address' />
        <select required name='deliveryZone' onChange={onChangeHandler} value={data.deliveryZone}>
          {DELIVERY_ZONES.map((zone) => (
            <option key={zone.zoneName} value={zone.zoneName}>{zone.zoneName}</option>
          ))}
        </select>
        <p className="delivery-mode-note">
          Cooked food delivery is available only in listed Dhaka service areas. Choose the nearest zone, then your area.
        </p>
        <select required name='area' onChange={onChangeHandler} value={data.area}>
          {selectedZone.areas.map((area) => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
        <input required name='street' onChange={onChangeHandler} value={data.street} type="text" placeholder='Road, house, flat details' />
        <input name='landmark' onChange={onChangeHandler} value={data.landmark} type="text" placeholder='Nearby landmark (optional)' />
        <input required name='phone' onChange={onChangeHandler} value={data.phone} type="text" placeholder='Phone' />
      </div>

      <div className="place-order-right">
        <div className="cart-total">
          <h2>Food Order Summary</h2>
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
