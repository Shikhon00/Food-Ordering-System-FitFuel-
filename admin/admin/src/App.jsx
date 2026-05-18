import React, { useEffect, useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import Sidebar from './components/Sidebar/Sidebar'
import { Routes,Route } from 'react-router-dom';
import List from './assets/pages/List/List';
import Add from './assets/pages/Add/Add';
import Orders from './assets/pages/Orders/Orders';
import Dashboard from './assets/pages/Dashboard/Dashboard';
import DeliveryPartners from './assets/pages/DeliveryPartners/DeliveryPartners';
import DeliveredOrders from './assets/pages/DeliveredOrders/DeliveredOrders';
import AdminLogin from './components/AdminLogin/AdminLogin';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';

import 'react-toastify/dist/ReactToastify.css';

const FRONTEND_URL = "http://localhost:5173";

// Admin app root. It protects admin pages behind an admin session and defines routes.
const App = () => {
    const url ="http://localhost:4000"
    const [adminEmail, setAdminEmail] = useState(localStorage.getItem('fitfuelAdminSession') || '');
    const isAuthenticated = Boolean(adminEmail);

    // Customer app can redirect here after admin login; this reads that URL session.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const incomingAdminEmail = params.get('email');
        const loginStatus = params.get('login');

        if (params.get('admin') === '1' && incomingAdminEmail) {
            localStorage.setItem('fitfuelAdminSession', incomingAdminEmail);
            if (loginStatus === 'success') {
                sessionStorage.setItem('fitfuelAdminLoginMessage', 'Admin login successful');
            }
            setAdminEmail(incomingAdminEmail);
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        if (params.get('admin') === '1' && adminEmail) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [adminEmail]);

    // Show login success toast once after redirect/login.
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        const loginMessage = sessionStorage.getItem('fitfuelAdminLoginMessage');
        if (loginMessage) {
            toast.success(loginMessage);
            sessionStorage.removeItem('fitfuelAdminLoginMessage');
        }
    }, [isAuthenticated]);

    // Login can happen directly on admin app.
    const handleLogin = async ({ email, password }) => {
        const response = await axios.post(url + "/api/admin/login", {
            email,
            password,
        });

        if (response.data.success) {
            localStorage.setItem('fitfuelAdminSession', response.data.email);
            sessionStorage.setItem('fitfuelAdminLoginMessage', 'Admin login successful');
            setAdminEmail(response.data.email);
        }

        return response.data;
    };

    // Navbar profile modal uses this to update admin credentials.
    const handleSaveProfile = async ({ email, password }) => {
        const response = await axios.post(url + "/api/admin/profile", {
            email,
            password,
        });

        if (response.data.success) {
            localStorage.setItem('fitfuelAdminSession', response.data.email);
            setAdminEmail(response.data.email);
        }

        return response.data;
    };

    // Admin logout returns to customer storefront.
    const handleLogout = () => {
        localStorage.removeItem('fitfuelAdminSession');
        setAdminEmail('');
        window.location.href = FRONTEND_URL;
    };

    // If no session exists, show only login page.
    if (!isAuthenticated) {
        return (
            <>
                <ToastContainer/>
                <AdminLogin onLogin={handleLogin}/>
            </>
        );
    }

    return (
        <div>
            <ToastContainer/>
            <Navbar adminEmail={adminEmail} onSaveProfile={handleSaveProfile} onLogout={handleLogout}/>
            <hr/>
            <div className="app-content">
                <Sidebar/>
                <Routes>
                    <Route path='/' element={<Dashboard url={url}/>}></Route>
                    <Route path='/add' element={<Add url={url}/>}></Route>
                    <Route path='/list' element={<List url={url}/>}></Route>
                    <Route path='/orders' element={<Orders url={url}/>}></Route>
                    <Route path='/delivered-orders' element={<DeliveredOrders url={url}/>}></Route>
                    <Route path='/delivery-partners' element={<DeliveryPartners url={url}/>}></Route>
                </Routes>
            </div>
        </div>
    )
}

export default App
