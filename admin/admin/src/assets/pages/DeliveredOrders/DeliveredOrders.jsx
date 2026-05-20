import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { assets } from '../../assets';
import '../Orders/Orders.css';

// Separate admin view for completed deliveries and rider reports/refund notices.
const DeliveredOrders = ({ url }) => {
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("delivered");
  const [refundingOrderId, setRefundingOrderId] = useState("");

  // Loads delivered and cancelled orders for completed-order review.
  const fetchDeliveredOrders = useCallback(async () => {
    const response = await axios.get(`${url}/api/order/list`);

    if (response.data.success) {
      setOrders((response.data.data || []).filter((order) =>
        order.deliveryStatus === "Delivered" ||
        order.status === "Delivered" ||
        order.status === "Cancelled"
      ));
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

  // Confirms the cancellation refund and removes it from the admin cancelled list.
  const markRefundSent = async (orderId) => {
    setRefundingOrderId(orderId);

    try {
      const response = await axios.post(`${url}/api/order/cancel-refund-sent`, { orderId });

      if (response.data.success) {
        toast.success(response.data.message || "Refund sent");
        fetchDeliveredOrders();
      } else {
        toast.error(response.data.message || "Unable to mark refund sent");
      }
    } catch {
      toast.error("Unable to mark refund sent");
    } finally {
      setRefundingOrderId("");
    }
  };

  const deliveredOrders = orders.filter((order) => order.deliveryStatus === "Delivered" || order.status === "Delivered");
  const cancelledOrders = orders.filter((order) => order.status === "Cancelled");
  const visibleOrders = view === "cancelled" ? cancelledOrders : deliveredOrders;

  return (
    <div className='order add'>
      <div className="completed-orders-heading">
        <div>
          <h3>{view === "cancelled" ? "Cancelled Food Orders" : "Delivered Food Orders"}</h3>
          <p>
            {view === "cancelled"
              ? "Review customer cancelled food orders and refund amount."
              : "Review completed deliveries and rider reports."}
          </p>
        </div>
        <div className="completed-orders-tabs">
          <button
            type="button"
            className={view === "delivered" ? "active" : ""}
            onClick={() => setView("delivered")}
          >
            Delivered ({deliveredOrders.length})
          </button>
          <button
            type="button"
            className={view === "cancelled" ? "active" : ""}
            onClick={() => setView("cancelled")}
          >
            Cancelled ({cancelledOrders.length})
          </button>
        </div>
      </div>
      <div className="order-list">
        {visibleOrders.length ? visibleOrders.map((order) => (
          <div key={order._id} className={`order-item ${view === "cancelled" ? "cancelled-order-item" : "delivered-order-item"}`}>
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
              {view === "cancelled" ? (
                <p className="order-cancel-note">{order.cancellationReason || "Order cancelled by customer"}</p>
              ) : null}
            </div>
            <div>
              <p className="order-item-amount">Order: Tk {order.amount}</p>
              {view === "cancelled" ? (
                <p className="cancel-refund-amount">
                  Refund: Tk {order.cancellationRefundAmount || 0}
                  <span>
                    {Number(order.cancellationRefundAmount || 0) < Number(order.amount || 0)
                      ? "Without delivery charge"
                      : "Full refund"}
                  </span>
                </p>
              ) : null}
            </div>
            <div>
              <p className={view === "cancelled" ? "payment-cancelled" : "payment-paid"}>
                {view === "cancelled" ? "Cancelled" : "Paid"}
              </p>
              <p>{new Date(order.date).toLocaleString()}</p>
              {order.cancelledAt ? <p>Cancelled: {new Date(order.cancelledAt).toLocaleString()}</p> : null}
            </div>
            <div className="assigned-rider">
              <strong>{order.assignedDeliveryPartner?.name || "Delivery partner"}</strong>
              <span>{order.deliveryStatus || order.status}</span>
              {view === "cancelled" ? (
                <button
                  type="button"
                  className="refund-sent-button"
                  disabled={refundingOrderId === order._id}
                  onClick={() => markRefundSent(order._id)}
                >
                  {refundingOrderId === order._id ? "Sending..." : "Refund Sent"}
                </button>
              ) : null}
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
        )) : <p className="empty-admin-orders">No {view === "cancelled" ? "cancelled" : "delivered"} order yet.</p>}
      </div>
    </div>
  );
};

export default DeliveredOrders;
