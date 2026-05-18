import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { StoreContext } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import './DeliveryPanel.css';

const STATUS_OPTIONS = ["Accepted", "Picked up package", "On the way", "Near customer", "Delivered"];
const OPEN_TASKS_PAGE_SIZE = 5;

// Riders can only choose statuses after their current status.
const getNextStatusOptions = (currentStatus = "Accepted") => {
  const currentIndex = STATUS_OPTIONS.indexOf(currentStatus);
  return currentIndex === -1 ? STATUS_OPTIONS : STATUS_OPTIONS.slice(currentIndex + 1);
};

// Delivery partner workspace for taking orders and updating delivery progress.
const DeliveryPanel = () => {
  const { url } = useContext(StoreContext);
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("deliveryToken") || "");
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState({ assignedOrders: [], deliveredOrders: [], openOrders: [], shopLocation: "" });
  const [activeView, setActiveView] = useState("active");
  const [openTasksPage, setOpenTasksPage] = useState(1);
  const [locationNotes, setLocationNotes] = useState({});
  const [selectedStatuses, setSelectedStatuses] = useState({});

  // Loads rider profile, assigned tasks, delivered history, and open paid orders.
  const loadTasks = async (authToken = token) => {
    if (!authToken) {
      return;
    }

    const profileResponse = await axios.post(`${url}/api/delivery/profile`, {}, { headers: { token: authToken } });
    if (profileResponse.data.success) {
      setProfile(profileResponse.data.data);
    }

    const taskResponse = await axios.post(`${url}/api/delivery/tasks`, {}, { headers: { token: authToken } });
    if (taskResponse.data.success) {
      setTasks(taskResponse.data.data);
    } else {
      setNotice(taskResponse.data.message || "Unable to load delivery tasks");
    }
  };

  // Auto-refresh keeps the rider panel synced with admin/customer changes.
  useEffect(() => {
    loadTasks();
    const intervalId = window.setInterval(() => loadTasks(), 12000);
    return () => window.clearInterval(intervalId);
  }, [token]);

  // Open orders are paginated so the rider panel does not become too long.
  const openTasksTotalPages = Math.max(1, Math.ceil((tasks.openOrders?.length || 0) / OPEN_TASKS_PAGE_SIZE));
  const openTasksStartIndex = (openTasksPage - 1) * OPEN_TASKS_PAGE_SIZE;
  const paginatedOpenOrders = (tasks.openOrders || []).slice(openTasksStartIndex, openTasksStartIndex + OPEN_TASKS_PAGE_SIZE);

  useEffect(() => {
    if (openTasksPage > openTasksTotalPages) {
      setOpenTasksPage(openTasksTotalPages);
    }
  }, [openTasksPage, openTasksTotalPages]);

  const logout = async () => {
    // If the rider has no active task, logout should make the rider Offline in admin view.
    if (token && !profile?.currentOrderId) {
      await axios.post(`${url}/api/delivery/availability`, { availability: "Offline" }, { headers: { token } });
    }

    localStorage.removeItem("deliveryToken");
    window.dispatchEvent(new Event("fitfuel:delivery-session-changed"));
    setToken("");
    setProfile(null);
    setTasks({ assignedOrders: [], deliveredOrders: [], openOrders: [], shopLocation: "" });
    navigate("/", { replace: true });
  };

  // Start Shift = Free, End Shift = Offline.
  const updateAvailability = async (availability) => {
    const response = await axios.post(`${url}/api/delivery/availability`, { availability }, { headers: { token } });
    setNotice(response.data.message || (availability === "Free" ? "Shift started" : "Shift ended"));

    loadTasks();
  };

  // Rider accepts an open delivery task.
  const claimOrder = async (orderId) => {
    const response = await axios.post(`${url}/api/delivery/claim`, { orderId }, { headers: { token } });
    setNotice(response.data.message);
    loadTasks();
  };

  // Rider sends assigned task back to the open queue.
  const rejectOrder = async (orderId) => {
    const response = await axios.post(`${url}/api/delivery/reject`, { orderId }, { headers: { token } });
    setNotice(response.data.message);
    loadTasks();
  };

  // Sends the rider's selected next delivery status and location note to backend.
  const updateOrderStatus = async (orderId) => {
    const deliveryStatus = selectedStatuses[orderId];

    if (!deliveryStatus) {
      setNotice("Please select a delivery status first");
      return;
    }

    const response = await axios.post(
      `${url}/api/delivery/status`,
      { orderId, deliveryStatus, locationNote: locationNotes[orderId] },
      { headers: { token } }
    );

    setNotice(response.data.message);
    loadTasks();
  };

  if (!token) {
    return (
      <main className="delivery-panel auth-panel">
        <div className="delivery-auth-card">
          <h2>Delivery Partner Panel</h2>
          <p>Please open Sign in, choose Delivery Partner, and login or register there.</p>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fitfuel:login-required", { detail: { message: "Delivery partner login is required.", role: "delivery" } }))}>
            Open Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="delivery-panel">
      <section className="delivery-panel-header">
        <div>
          <h2>Delivery Partner Panel</h2>
          <p>Package pickup from {tasks.shopLocation || "FitFuel Packing Hub, Uttara Sector 10, Dhaka"}</p>
        </div>
        <div className="delivery-header-actions">
          <button type="button" disabled={Boolean(profile?.currentOrderId)} onClick={() => updateAvailability("Free")}>Start Shift</button>
          <button type="button" disabled={Boolean(profile?.currentOrderId)} onClick={() => updateAvailability("Offline")}>End Shift</button>
          <button type="button" className="secondary" onClick={logout}>Logout</button>
        </div>
      </section>

      {profile ? (
        <section className="delivery-profile-strip">
          <span>{profile.name}</span>
          <span>{profile.status}</span>
          <span>{profile.availability}</span>
          <span>{profile.phone}</span>
          <span>Delivered: {profile.deliveredCount || 0}</span>
          <span>Reports: {profile.reportCount || 0}</span>
          <span>Warnings: {profile.warningCount || 0}</span>
        </section>
      ) : null}

      {profile?.lastWarningReason ? (
        <p className="delivery-warning-note">{profile.lastWarningReason}</p>
      ) : null}

      {notice ? <p className="delivery-notice">{notice}</p> : null}

      <section className="delivery-view-tabs">
        <button type="button" className={activeView === "active" ? "active" : ""} onClick={() => setActiveView("active")}>
          Active Tasks
        </button>
        <button type="button" className={activeView === "delivered" ? "active" : ""} onClick={() => setActiveView("delivered")}>
          Delivered Orders
        </button>
      </section>

      {activeView === "delivered" ? (
        <section className="delivery-task-column delivered-orders-view">
          <h3>Delivered Orders</h3>
          {tasks.deliveredOrders?.length ? tasks.deliveredOrders.map((order) => (
            <article key={order._id} className="delivery-task-card delivered">
              <div className="delivery-task-topline">
                <strong>{order.address?.firstName} {order.address?.lastName}</strong>
                <span>Delivered</span>
              </div>
              <p>Delivered to: {order.address?.area || "Dhaka"}, {order.address?.street}</p>
              <p>Phone: {order.address?.phone}</p>
              <p>Amount: Tk {order.amount}</p>
            </article>
          )) : <p className="empty-delivery-state">No delivered order yet.</p>}
        </section>
      ) : (
      <section className="delivery-task-grid">
        <div className="delivery-task-column">
          <h3>My Assigned Tasks</h3>
          {tasks.assignedOrders.length ? tasks.assignedOrders.map((order) => (
            <article key={order._id} className="delivery-task-card">
              <div className="delivery-task-topline">
                <strong>{order.address?.firstName} {order.address?.lastName}</strong>
                <span>{order.deliveryStatus || "Assigned"}</span>
              </div>
              <p>Deliver to: {order.address?.area || "Dhaka"}, {order.address?.street}</p>
              <p>Phone: {order.address?.phone}</p>
              <p>Amount: Tk {order.amount} | ETA: {order.deliveryMeta?.estimatedDeliveryTime || "45-75 min"}</p>
              <p>Mode: {order.deliveryMeta?.deliveryMode || "Packed fitness product"}</p>
              <p>Delivery deadline: {order.deliveryMeta?.deliveryDeadline ? new Date(order.deliveryMeta.deliveryDeadline).toLocaleString() : "Not available"}</p>
              <input
                value={locationNotes[order._id] || ""}
                onChange={(event) => setLocationNotes((prev) => ({ ...prev, [order._id]: event.target.value }))}
                placeholder="Location note, e.g. Crossing Banani Road 11"
              />
              <div className="delivery-status-control">
                <label>Change delivery status</label>
                <select
                  value={selectedStatuses[order._id] || ""}
                  onChange={(event) => setSelectedStatuses((prev) => ({ ...prev, [order._id]: event.target.value }))}
                >
                  <option value="">Select status</option>
                  {getNextStatusOptions(order.deliveryStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button type="button" onClick={() => updateOrderStatus(order._id)}>
                  Update Status
                </button>
              </div>
              {order.deliveryStatus !== "Delivered" ? (
                <button type="button" className="reject-button" onClick={() => rejectOrder(order._id)}>Reject Task</button>
              ) : null}
            </article>
          )) : <p className="empty-delivery-state">No assigned task right now.</p>}
        </div>

        <div className="delivery-task-column">
          <div className="delivery-column-heading">
            <h3>Open Delivery Tasks</h3>
            <span>{tasks.openOrders.length || 0} available</span>
          </div>
          {tasks.openOrders.length ? paginatedOpenOrders.map((order) => (
            <article key={order._id} className="delivery-task-card">
              <strong>{order.address?.firstName} {order.address?.lastName}</strong>
              <p>Deliver to: {order.address?.area || "Dhaka"}, {order.address?.street}</p>
              <p>Items: {order.items?.length || 0} | Tk {order.amount} | ETA: {order.deliveryMeta?.estimatedDeliveryTime || "45-75 min"}</p>
              <p>Mode: {order.deliveryMeta?.deliveryMode || "Packed fitness product"}</p>
              <p>Deadline: {order.deliveryMeta?.deliveryDeadline ? new Date(order.deliveryMeta.deliveryDeadline).toLocaleString() : "Not available"}</p>
              <button type="button" onClick={() => claimOrder(order._id)}>Take Delivery</button>
            </article>
          )) : <p className="empty-delivery-state">No open paid delivery task.</p>}
          {tasks.openOrders.length > OPEN_TASKS_PAGE_SIZE ? (
            <div className="delivery-pagination">
              <button
                type="button"
                onClick={() => setOpenTasksPage((page) => Math.max(1, page - 1))}
                disabled={openTasksPage === 1}
              >
                Previous
              </button>
              <span>Page {openTasksPage} of {openTasksTotalPages}</span>
              <button
                type="button"
                onClick={() => setOpenTasksPage((page) => Math.min(openTasksTotalPages, page + 1))}
                disabled={openTasksPage === openTasksTotalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </section>
      )}
    </main>
  );
};

export default DeliveryPanel;
