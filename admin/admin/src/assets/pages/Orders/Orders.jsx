import React from 'react'
import './Orders.css'
import { useState } from 'react';
import  axios  from 'axios';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { assets } from '../../assets';

const ORDERS_PER_PAGE = 10;

// Admin order management page for active/not-yet-delivered orders.
const Orders = ({url}) => {

const [orders,setOrders]= useState([]);
const [deliveryPartners, setDeliveryPartners] = useState([]);
const [selectedPartners, setSelectedPartners] = useState({});
const [currentPage, setCurrentPage] = useState(1);
// Loads paid active orders and hides delivered/expired orders from this page.
const fatchAllOrders = async ()=> {
  const response = await axios.get(url+"/api/order/list")

  if(response.data.success){
    setOrders((response.data.data || []).filter((order) =>
      order.deliveryStatus !== "Delivered" &&
      order.status !== "Delivered" &&
      order.status !== "Expired" &&
      order.status !== "Cancelled" &&
      order.status !== "Payment Cancelled" &&
      order.status !== "Refunded"
    ))
  }else{
    toast.error("Error")
  }
}

// Loads riders so admin can assign a free rider to an order.
const fetchDeliveryPartners = async () => {
  const response = await axios.get(url + "/api/delivery/admin/list");

  if (response.data.success) {
    setDeliveryPartners(response.data.data || []);
  }
}

useEffect(()=>{
  fatchAllOrders();
  fetchDeliveryPartners();
},[])

// Assign selected free delivery partner to the chosen order.
const assignDeliveryPartner = async (orderId) => {
  const partnerId = selectedPartners[orderId];

  if (!partnerId) {
    toast.error("Please select a free delivery partner");
    return;
  }

  const response = await axios.post(url + "/api/order/assign-delivery", { orderId, partnerId });

  if (response.data.success) {
    toast.success(response.data.message);
    fatchAllOrders();
    fetchDeliveryPartners();
  } else {
    toast.error(response.data.message || "Error");
  }
}

// Keep current page valid when order count changes after refresh/assignment.
useEffect(() => {
  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
}, [orders, currentPage]);

const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
const paginatedOrders = orders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
// Only approved and free riders are shown in assignment dropdown.
const freeDeliveryPartners = deliveryPartners.filter((partner) => partner.status === "Approved" && partner.availability === "Free");

  return (
    <div className='order add'>
<h3>Order Page</h3>
<div className="order-list">
  {paginatedOrders.map((order,index)=>(
    <div key={index} className="order-item">

<img src={assets.parcel_icon} alt="" />
<div>
  <p className="order-item-food">
    {
      order.items.map((item,index)=>{
        if(index===order.items.length-1){
          return item.name +"X"+ item.quantity
        }
        else{
          return item.name +"X"+ item.quantity +", "
        }
      })
    }
  </p>
  <p className="order-item-name">{order.address.firstName} {order.address.lastName}</p>
  <p>{order.address.area || order.address.city}, {order.address.street}</p>
  {order.address.landmark ? <p>Landmark: {order.address.landmark}</p> : null}
  <p>{order.address.phone}</p>
  <p>ETA: {order.deliveryMeta?.estimatedDeliveryTime || "Up to 60 min"}</p>
  <p>Mode: {order.deliveryMeta?.deliveryMode || "Cooked food"}</p>
  <p>Kitchen: {order.deliveryMeta?.kitchenAddress || order.address.shopAddress || "Nearest kitchen hub"}</p>
  <p>Delivery deadline: {order.deliveryMeta?.deliveryDeadline ? new Date(order.deliveryMeta.deliveryDeadline).toLocaleString() : "Not available"}</p>
  {order.deliveryReviewRequired ? (
    <p className="order-review-note">{order.deliveryIssueReason || "Admin review required"}</p>
  ) : null}
</div>
<p className="order-item-amount">Tk {order.amount}</p>
<div>
  <p>Items: {order.items.length}</p>
  <p className={order.payment ? "payment-paid" : "payment-pending"}>
    {order.payment ? "Paid" : order.paymentStatus || "Pending"}
  </p>
</div>
<div className="delivery-assignment-control">
  <label>Delivery</label>
  {order.assignedDeliveryPartner ? (
    <div className="assigned-rider">
      <strong>{order.assignedDeliveryPartner.name}</strong>
      <span>{order.deliveryStatus}</span>
      <small>{order.status}</small>
    </div>
  ) : order.payment && !["Delivered", "Cancelled", "Payment Cancelled", "Refunded"].includes(order.status) ? (
    <>
      <select
        value={selectedPartners[order._id] || ""}
        onChange={(event) => setSelectedPartners((prev) => ({ ...prev, [order._id]: event.target.value }))}
      >
        <option value="">Select free rider</option>
        {freeDeliveryPartners.map((partner) => (
          <option key={partner._id} value={partner._id}>
            {partner.name} - {partner.phone}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => assignDeliveryPartner(order._id)}>Assign</button>
    </>
  ) : (
    <div className="order-status-badge">{order.status}</div>
  )}
</div>
    </div>
  ))}
</div>
{orders.length > ORDERS_PER_PAGE ? (
  <div className="pagination">
    <button
      type="button"
      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
      disabled={currentPage === 1}
    >
      Previous
    </button>
    <span>Page {currentPage} of {totalPages}</span>
    <button
      type="button"
      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
      disabled={currentPage === totalPages}
    >
      Next
    </button>
  </div>
) : null}
    </div>
  )
}

export default Orders
