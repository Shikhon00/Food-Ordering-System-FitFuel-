import React, { useContext, useEffect, useState } from 'react'
import './Verify.css'
import { useSearchParams } from 'react-router-dom'
import { StoreContext } from '../../context/StoreContext';
import axios from 'axios';

// Stripe redirects users here after payment success or cancellation.
const Verify = () => {

    const [searchParams] = useSearchParams();
    const [paymentMessage, setPaymentMessage] = useState("");
    const [paymentState, setPaymentState] = useState("loading");
    // success and orderId come from the Stripe redirect URL.
    const success = searchParams.get("success");
    const orderId = searchParams.get("orderId");
    const { url, fetchFoodList } = useContext(StoreContext);

    const redirectToHome = () => {
        window.location.replace(`${window.location.origin}/`);
    };

    const redirectToOrders = () => {
        window.location.replace(`${window.location.origin}/orders`);
    };

    // Tells backend whether Stripe succeeded so it can confirm or clean up the order.
    const verifyPayment = async () => {
        if (!success || !orderId) {
            redirectToHome();
            return;
        }

        try {
            const response = await axios.post(url + "/api/order/verify", { success, orderId });
            // Once backend responds, this checkout is no longer pending.
            localStorage.removeItem("pendingCheckoutOrderId");
            localStorage.removeItem("pendingCheckoutStartedAt");
            sessionStorage.removeItem("pendingCheckoutRedirecting");
            sessionStorage.removeItem("pendingCheckoutLeftPage");

            if (response.data.success) {
                await fetchFoodList();
                redirectToOrders();
            }
            else {
                await fetchFoodList();
                setPaymentState("cancelled");
                setPaymentMessage(response.data.message || "Payment cancelled. Your order was not confirmed.");
            }
        } catch (error) {
            setPaymentState("error");
            setPaymentMessage("We could not verify the payment. Please check your orders or try again.");
        }
    }

    useEffect(() => {
        verifyPayment();
    }, [])

    return (
        <div className='verify'>
            {paymentState === "loading" ? (
                <div className="spinner"></div>
            ) : (
                <div className={`verify-card ${paymentState}`}>
                    <h2>{paymentState === "cancelled" ? "Payment Cancelled" : "Payment Check Failed"}</h2>
                    <p>{paymentMessage}</p>
                    <button type="button" onClick={redirectToHome}>Back to Home</button>
                </div>
            )}
        </div>
    )
}

export default Verify
