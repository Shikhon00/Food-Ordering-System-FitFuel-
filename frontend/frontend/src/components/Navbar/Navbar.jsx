import React, { useContext, useState } from 'react'
import './Navbar.css' 
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';

// Top navigation for the customer store. It also shows login/profile/cart access.
const Navbar = ({setShowLogin}) => {
const [menu,setMenu]= useState("home");
const {getTotalCartAmount,token,setToken}=useContext(StoreContext)

const Navigate = useNavigate()

// Logout clears the customer JWT from localStorage and shared context.
const logout = () =>{
	localStorage.removeItem("token");
	setToken("");
	Navigate("/")
}

return (
<div className ='navbar'>
  <Link to={'/'} className="brand-mark">
    <div className="logo">
      <span className="logo-icon">⚡</span>
      <span>FitFuel</span><b>.</b>
    </div>
  </Link>
   <ul className=" navbar-menu">

     <Link to='/' onClick={ () =>setMenu("home")} className={menu==="home"?"active":""}>Home</Link>

     <a href='#explore-menu' onClick={ () =>setMenu("products")} className={menu==="products"?"active":""}>Food</a>

     <a href='#footer' onClick={ () =>setMenu("about")}
     className={menu==="about"?"active":""}>About</a>
     <Link to='/orders' onClick={ () =>setMenu("history")} className={menu==="history"?"active":""}>Order History</Link>

   </ul>
<div className="navbar-right">
    <img src={assets.search_icon} alt="" className="nav-icon" />
<div className="navbar-search-icon">

<Link to={'/cart'}>
<img src={assets.basket_icon} alt="" className="nav-icon" /> 
</Link>

{/* Small dot appears when cart total is greater than zero. */}
<div className = {getTotalCartAmount()===0?"":"dot"}></div>
</div>


{!token ?<button onClick={()=>setShowLogin(true)}>Sign in </button>
:<div className='navbar-profile'>
<img src={assets.profile_icon} alt="" className="nav-icon"/>
<ul className="nav-profile-dropdown">
<li onClick={()=>Navigate('/orders')}><img src={assets.bag_icon} alt=""/><p>Order History</p></li>
<hr/>
<li onClick={logout}><img src={assets.logout_icon} alt=""/><p>Logout</p></li>
</ul>
</div>}
</div>
</div>
) 
}
export default Navbar
