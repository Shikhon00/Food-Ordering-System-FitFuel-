
import React, { useContext, useEffect, useState } from 'react'
import './Cart.css'
import { StoreContext } from '../../context/StoreContext'
import { useNavigate } from 'react-router-dom'

const Cart = () => {

  const { cartItems, food_list, addToCart, removeFromCart ,getTotalCartAmount, getCartNutritionTotals, url, token, askUserToLogin, cancelPendingCheckout} = useContext(StoreContext);
  const navigate = useNavigate();
  // macroTotals shows nutrition summary for everything currently in cart.
  const macroTotals = getCartNutritionTotals();
  const [checkoutNotice, setCheckoutNotice] = useState("");
  // Detect cart quantities that are now higher than available stock.
  const stockIssues = food_list.filter((item) => (cartItems[item._id] || 0) > Number(item.quantity || 0));

  // Builds a readable stock warning for the customer.
  const getStockIssueMessage = () => {
    if (!stockIssues.length) {
      return "";
    }

    return stockIssues
      .map((item) => `${item.name} has only ${item.quantity} left in stock`)
      .join(". ");
  };

  useEffect(() => {
    // If user returned from an abandoned checkout, clean up before showing cart.
    const settlePendingCheckout = async () => {
      const result = await cancelPendingCheckout(false);

      if (result?.message) {
        setCheckoutNotice(result.message);
      }
    };

    settlePendingCheckout();

    const handleCheckoutCancelled = (event) => {
      setCheckoutNotice(event.detail?.message || "Payment cancelled. Reserved stock has been restored.");
    };

    window.addEventListener("fitfuel:checkout-cancelled", handleCheckoutCancelled);

    return () => {
      window.removeEventListener("fitfuel:checkout-cancelled", handleCheckoutCancelled);
    };
  }, [cancelPendingCheckout]);

  useEffect(() => {
    // Keep checkout blocked if product stock changes while cart is open.
    const stockIssueMessage = getStockIssueMessage();

    if (stockIssueMessage) {
      setCheckoutNotice(`Please update your cart before checkout. ${stockIssueMessage}.`);
    }
  }, [food_list, cartItems]);

  return (
    <div className='cart'>
      {checkoutNotice ? (
        <div className="cart-checkout-notice">
          <p>{checkoutNotice}</p>
          <button type="button" onClick={() => setCheckoutNotice("")}>x</button>
        </div>
      ) : null}
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Items</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Remove</p>
        </div>
        <br />
        <hr />
        {food_list.map((item, index) => {
          if (cartItems[item._id] > 0) {
            return (
              <div key={index}>
                <div className='cart-items-title cart-items-item'>
                  <img src={url+"/images/"+item.image} alt="" />
                  <p>{item.name}</p>
                  <p>Tk {item.price}</p>
                  <div className='cart-quantity-controls'>
                    <button
                      type='button'
                      onClick={() => removeFromCart(item._id)}
                    >
                      -
                    </button>
                    <p>{cartItems[item._id]}</p>
                    <button
                      type='button'
                      onClick={() => addToCart(item._id)}
                      disabled={cartItems[item._id] >= item.quantity}
                    >
                      +
                    </button>
                  </div>
                  <p>Tk {item.price * cartItems[item._id]}</p>
                  <p onClick={() => removeFromCart(item._id)} className='cross'>x</p>
                </div>
                <hr />
              </div>
            )
          }
        })}
      </div>
      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Food Cart Totals</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>Tk {getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>Tk { getTotalCartAmount()===0?0:60}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>Total</b>
              <b>Tk { getTotalCartAmount()===0?0: getTotalCartAmount ()+60}</b>
            </div>
          </div>
          <div className="cart-macro-summary">
            <h3>Food Nutrition Totals</h3>
            <div className="cart-macro-grid">
              <div><span>Calories</span><strong>{macroTotals.calories}</strong></div>
              <div><span>Protein</span><strong>{macroTotals.protein}g</strong></div>
              <div><span>Carbs</span><strong>{macroTotals.carbs}g</strong></div>
              <div><span>Fat</span><strong>{macroTotals.fat}g</strong></div>
            </div>
          </div>
          <button onClick={async ()=>{
            // Checkout requires login because backend needs a user id.
            if (!token) {
              askUserToLogin("Please login before placing your order.");
              return;
            }

            // Clear any previous pending checkout before starting a new one.
            const pendingResult = await cancelPendingCheckout(false);
            if (pendingResult?.message) {
              setCheckoutNotice(pendingResult.message);
              return;
            }

            const stockIssueMessage = getStockIssueMessage();
            if (stockIssueMessage) {
              setCheckoutNotice(`Please update your cart before checkout. ${stockIssueMessage}.`);
              return;
            }

            navigate('/order')
          }} disabled={stockIssues.length > 0}>CONTINUE TO CHECKOUT</button>
        </div>
        <div className="cart-promocode">
          <div>
            <p>If you have a promo code, enter it here</p>
            <div className='cart-promocode-input'>
              <input type="text" placeholder='promo code' />
              <button>Submit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
