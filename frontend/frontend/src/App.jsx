import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home/Home";
import Cart from "./pages/Cart/Cart";
import PlaceOrder from "./pages/PlaceOrder/PlaceOrder";
import LoginPopup from "./components/LoginPopup/LoginPopup";
import Verify from "./pages/Verify/Verify";
import MyOrders from "./pages/MyOrders/MyOrders";
import DeliveryPanel from "./pages/DeliveryPanel/DeliveryPanel";

// App is the customer-side root. It controls shared popups/notifications and routes.
const App = () => {
const location = useLocation()
// Login popup can open for user, admin, or delivery partner.
const [showLogin,setShowLogin] = useState (false)
const [loginRole,setLoginRole] = useState("user")
const [hasDeliverySession,setHasDeliverySession] = useState(Boolean(localStorage.getItem("deliveryToken")))
const [notification,setNotification] = useState(null)

const showNotification = (message, type = "success") => {
  setNotification({ message, type });
}

// When a delivery partner is inside /delivery, hide the normal shop navbar/footer.
const isDeliveryWorkspace = location.pathname === "/delivery" && hasDeliverySession

// Notifications disappear automatically after a few seconds.
useEffect(() => {
  if (!notification) {
    return;
  }

  const timeoutId = setTimeout(() => {
    setNotification(null);
  }, 3000);

  return () => clearTimeout(timeoutId);
}, [notification]);

useEffect(() => {
  // Other components can dispatch this event when an unauthenticated user tries
  // to use a protected feature like cart/checkout.
  const handleLoginRequired = (event) => {
    showNotification(event.detail?.message || "Please login to continue.", "error");
    setLoginRole(event.detail?.role || "user");
    setShowLogin(true);
  };
  // Checkout cancellation is handled globally so user sees a clear message.
  const handleCheckoutCancelled = (event) => {
    showNotification(
      event.detail?.message || "Payment cancelled. Reserved stock has been restored.",
      event.detail?.type || "error"
    );
  };

  window.addEventListener("fitfuel:login-required", handleLoginRequired);
  window.addEventListener("fitfuel:checkout-cancelled", handleCheckoutCancelled);
  // Delivery login stores a separate token from normal customer login.
  const refreshDeliverySession = () => setHasDeliverySession(Boolean(localStorage.getItem("deliveryToken")));

  window.addEventListener("fitfuel:delivery-session-changed", refreshDeliverySession);
  window.addEventListener("storage", refreshDeliverySession);

  return () => {
    window.removeEventListener("fitfuel:login-required", handleLoginRequired);
    window.removeEventListener("fitfuel:checkout-cancelled", handleCheckoutCancelled);
    window.removeEventListener("fitfuel:delivery-session-changed", refreshDeliverySession);
    window.removeEventListener("storage", refreshDeliverySession);
  };
}, []);

  return (
    <>
{notification ? <div className={`app-notification ${notification.type}`}>{notification.message}</div> : <></>}
{showLogin?<LoginPopup setShowLogin={setShowLogin} onAuthMessage={showNotification} initialRole={loginRole}/>:<></>}
      <div className="app">
        {!isDeliveryWorkspace ? <Navbar setShowLogin={(value) => {
          // Navbar sign-in always starts as normal user login.
          if (value) {
            setLoginRole("user");
          }
          setShowLogin(value);
        }} /> : null}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<PlaceOrder />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/myorders" element={<MyOrders />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/delivery" element={<DeliveryPanel />} />
        </Routes>
      </div>
       
      {!isDeliveryWorkspace ? <Footer /> : null}
    </>
  );
};

export default App;
