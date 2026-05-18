import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../../assets';
import '../Orders/Orders.css';

// Separate admin view for completed deliveries and rider reports/refund notices.
const DeliveredOrders = ({ url }) => {
  const [orders, setOrders] = useState([]);

  // Loads only orders that are already delivered.
  const fetchDeliveredOrders = useCallback(async () => {
    const response = await axios.get(`${url}/api/order/list`);

    if (response.data.success) {
      setOrders((response.data.data || []).filter((order) => order.deliveryStatus === "Delivered" || order.status === "Delivered"));
    } else {
      toast.error(response.data.message || "Failed to load delivered orders");
    }
  }, [url]);

  // Refresh delivered list periodically for admin review.
  useEffect(() => {
    const timeoutId = window.setTimeout(fetchDeliveredOrders, 0);
    const intervalId = window.setInterval(fetchDeliveredOrders, 15000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [fetchDeliveredOrders]);

  // Sends the customer-visible refund notice after admin reviews a rider report.
  const sendRefundNotice = async (orderId) => {
    const response = await axios.post(`${url}/api/order/refund-notice`, { orderId });

    if (response.data.success) {
      toast.success(response.data.message || "Refund notice sent to customer");
      fetchDeliveredOrders();
    } else {
      toast.error(response.data.message || "Unable to send refund notice");
    }
  };

  return (
    <div className='order add'>
      <h3>Delivered Products</h3>
      <div className="order-list">
        {orders.length ? orders.map((order) => (
          <div key={order._id} className="order-item delivered-order-item">
            <img src={assets.parcel_icon} alt="" />
            <div>
              <p className="order-item-food">
                {order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}
              </p>
              <p className="order-item-name">{order.address.firstName} {order.address.lastName}</p>
              <p>{order.address.area || order.address.city}, {order.address.street}</p>
              <p>{order.address.phone}</p>
              {order.riderReported ? (
                <p className="order-review-note">Rider report: {order.riderReportReason || "Customer reported this delivery"}</p>
              ) : null}
              {order.refundNotice ? (
                <p className="order-review-note">Customer notice: {order.refundNotice}</p>
              ) : null}
            </div>
            <p className="order-item-amount">Tk {order.amount}</p>
            <div>
              <p className="payment-paid">Paid</p>
              <p>{new Date(order.date).toLocaleString()}</p>
            </div>
            <div className="assigned-rider">
              <strong>{order.assignedDeliveryPartner?.name || "Delivery partner"}</strong>
              <span>{order.deliveryStatus || order.status}</span>
              {order.riderReported ? (
                <button
                  type="button"
                  className="refund-notice-button"
                  disabled={Boolean(order.refundNotice)}
                  onClick={() => sendRefundNotice(order._id)}
                >
                  {order.refundNotice ? "Notice Sent" : "Send Refund Notice"}
                </button>
              ) : null}
            </div>
          </div>
        )) : <p className="empty-admin-orders">No delivered order yet.</p>}
      </div>
    </div>
  );
};

export default DeliveredOrders;
