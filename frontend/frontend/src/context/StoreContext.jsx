import { createContext, useCallback, useEffect, useRef } from "react";
import { useState } from "react";
import axios  from 'axios';

export  const StoreContext = createContext (null)

// Empty macro totals used before cart products are loaded.
const defaultNutritionTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};
const CHECKOUT_RETURN_GRACE_MS = 8000;

// Opens the login popup from anywhere in the app without passing props through many levels.
const askUserToLogin = (message = "Please login to continue.") => {
  window.dispatchEvent(new CustomEvent("fitfuel:login-required", { detail: { message } }));
};

// Main shared state provider for products, cart, auth token, and checkout cleanup.
export const StoreContextProvider = (props) => {
 const [ cartItems,setCartItems]=useState({});

 const url = "http://localhost:4000"
 const [token,setToken] = useState("");
 const [food_list,setFoodList]=useState([])
 const isCancellingCheckoutRef = useRef(false);

// Adds a product to the cart locally first, then syncs the change to the backend.
const addToCart =async (itemId) => {
if (!token) {
  askUserToLogin("Please login to add food to your cart.");
  return;
}

// Find product details so we can stop users from adding more than available stock.
const itemInfo = food_list.find((product) => product._id === itemId);
const currentQuantity = cartItems[itemId] || 0;

if (!itemInfo) {
  return;
}

if (currentQuantity >= itemInfo.quantity) {
  alert("Maximum available quantity reached");
  return;
}

// Optimistic UI update: cart changes immediately, then rolls back if API fails.
setCartItems((prev)=> ({...prev, [itemId]: currentQuantity + 1}))

if(token) {
	const response = await axios.post(url+"/api/cart/add",{itemId},{headers:{token}})
	if(!response.data.success){
		setCartItems((prev)=> ({...prev, [itemId]: currentQuantity}))
		alert(response.data.message)
	}
}


}

// Removes one quantity from cart and tells backend to save it.
const removeFromCart = async (itemId) => {

setCartItems((prev)=> ({...prev, [itemId]: prev[itemId]-1}))
if(token) {
		await axios.post(url+"/api/cart/remove",{itemId},{headers:{token}})
	}

}

// Calculates the cart price total from product prices and quantities.
const getTotalCartAmount = () => {
  let totalAmount = 0;

  for (const item in cartItems) {
    if (cartItems[item] > 0) {
      const itemInfo = food_list.find(
        (product) => product._id === item
      );

      // Product may be missing briefly while food_list is loading.
      if (itemInfo) {
        totalAmount += itemInfo.price * cartItems[item];
      }
    }
  }
  return totalAmount;
};

// Calculates macro totals from the same cart data used for price totals.
const getCartNutritionTotals = () => {
  return Object.entries(cartItems).reduce((totals, [itemId, quantity]) => {
    if (quantity <= 0) {
      return totals;
    }

    const itemInfo = food_list.find((product) => product._id === itemId);

    if (!itemInfo) {
      return totals;
    }

    return {
      calories: totals.calories + Number(itemInfo.calories || 0) * quantity,
      protein: totals.protein + Number(itemInfo.protein || 0) * quantity,
      carbs: totals.carbs + Number(itemInfo.carbs || 0) * quantity,
      fat: totals.fat + Number(itemInfo.fat || 0) * quantity,
    };
  }, { ...defaultNutritionTotals });
};



// Loads the current product list from backend.
const fetchFoodList = useCallback(async () => {
	const response = await axios.get(url+"/api/food/list");
	if (response.data.success) {
		setFoodList(response.data.data)
	}
}, [])

// Loads the user's saved cart after login or page refresh.
const loadCartData = useCallback(async (token) => {
	const response = await axios.post(url+"/api/cart/get",{},{headers:{token}})
	if (response.data.success) {
		setCartItems(response.data.cartData || {});
	}
}, [])

// If Stripe checkout is abandoned, this asks backend to restore stock and cart.
const cancelPendingCheckout = useCallback(async (notify = true) => {
	const pendingOrderId = localStorage.getItem("pendingCheckoutOrderId");

	if (!pendingOrderId || isCancellingCheckoutRef.current) {
		return null;
	}

	// Prevent two browser events from cancelling the same pending order twice.
	isCancellingCheckoutRef.current = true;
	localStorage.removeItem("pendingCheckoutOrderId");

	try {
		const response = await axios.post(url + "/api/order/verify", {
			success: "false",
			orderId: pendingOrderId,
		});
		localStorage.removeItem("pendingCheckoutStartedAt");
		sessionStorage.removeItem("pendingCheckoutRedirecting");
		sessionStorage.removeItem("pendingCheckoutLeftPage");
		await fetchFoodList();

		const authToken = token || localStorage.getItem("token");
		if (authToken) {
			await loadCartData(authToken);
		}

		const message = response.data.message || "Payment cancelled. Reserved stock has been restored.";
		if (notify) {
			window.dispatchEvent(new CustomEvent("fitfuel:checkout-cancelled", { detail: { message } }));
		}

		return response.data;
	} catch (error) {
		localStorage.setItem("pendingCheckoutOrderId", pendingOrderId);
		const message = "Unable to cancel the pending checkout automatically. Please try again.";
		if (notify) {
			window.dispatchEvent(new CustomEvent("fitfuel:checkout-cancelled", { detail: { message, type: "error" } }));
		}
		return { success: false, message };
	} finally {
		isCancellingCheckoutRef.current = false;
	}
}, [token, fetchFoodList, loadCartData])

// Decides whether a pending Stripe checkout should be auto-cancelled.
const shouldAutoCancelPendingCheckout = () => {
	const pendingOrderId = localStorage.getItem("pendingCheckoutOrderId");

	if (!pendingOrderId || document.visibilityState !== "visible") {
		return false;
	}

	if (sessionStorage.getItem("pendingCheckoutLeftPage") === "true") {
		return true;
	}

	const startedAt = Number(localStorage.getItem("pendingCheckoutStartedAt") || 0);
	return startedAt > 0 && Date.now() - startedAt > CHECKOUT_RETURN_GRACE_MS;
};

// First app load: fetch products, restore login token, and restore saved cart.
useEffect(()=>{
		
     async function loadData() {
        await fetchFoodList()
        if(localStorage.getItem("token")){
		setToken(localStorage.getItem("token"));
        await loadCartData(localStorage.getItem("token"));
	 }
     }
	loadData() 

},[fetchFoodList, loadCartData])

// Refresh product list on browser focus so stock numbers stay up to date.
useEffect(() => {
	const refreshFoodList = () => {
		fetchFoodList();
	};

	window.addEventListener("focus", refreshFoodList);

	return () => {
		window.removeEventListener("focus", refreshFoodList);
	};
}, [fetchFoodList])

// Watches browser return/visibility events to detect abandoned Stripe checkout.
useEffect(() => {
	const handleAppReturn = () => {
		if (shouldAutoCancelPendingCheckout()) {
			cancelPendingCheckout(true);
		}
	};

	const handleVisibilityChange = () => {
		if (shouldAutoCancelPendingCheckout()) {
			cancelPendingCheckout(true);
		}
	};

	const markCheckoutPageExit = () => {
		if (localStorage.getItem("pendingCheckoutOrderId")) {
			sessionStorage.setItem("pendingCheckoutLeftPage", "true");
		}
	};

	const intervalId = window.setInterval(() => {
		if (shouldAutoCancelPendingCheckout()) {
			cancelPendingCheckout(true);
		}
	}, 1000);

	window.addEventListener("focus", handleAppReturn);
	window.addEventListener("pageshow", handleAppReturn);
	window.addEventListener("pagehide", markCheckoutPageExit);
	document.addEventListener("visibilitychange", handleVisibilityChange);

	return () => {
		window.clearInterval(intervalId);
		window.removeEventListener("focus", handleAppReturn);
		window.removeEventListener("pageshow", handleAppReturn);
		window.removeEventListener("pagehide", markCheckoutPageExit);
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	};
}, [token, cancelPendingCheckout])

// Everything in contextValue is available through useContext(StoreContext).
const contextValue = {
food_list,
cartItems,
setCartItems,
addToCart,
removeFromCart,
getTotalCartAmount,
getCartNutritionTotals,
url,
token,
setToken,
fetchFoodList,
cancelPendingCheckout,
askUserToLogin,
}
return (
<StoreContext.Provider value={contextValue}>
{props.children}
</StoreContext.Provider>
)}
