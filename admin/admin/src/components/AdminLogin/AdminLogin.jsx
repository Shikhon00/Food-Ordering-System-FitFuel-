import React, { useState } from 'react'
import { toast } from 'react-toastify'
import './AdminLogin.css'

// Standalone admin login screen used when no admin session is saved.
const AdminLogin = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })

    // One input handler updates both email and password fields.
    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((currentData) => ({
            ...currentData,
            [name]: value,
        }))
    }

    // Submit calls App's onLogin function, which talks to the backend.
    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const result = await onLogin({
                email: formData.email.trim(),
                password: formData.password,
            });

            if (!result.success) {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Unable to login. Please check that the backend server is running.');
        }
    }

    return (
        <main className="admin-login">
            <section className="admin-login-panel">
                <div className="admin-login-brand">
                    <span className="admin-login-logo">F</span>
                    <div>
                        <h1>FitFuel Admin</h1>
                        <p>Sign in to manage products, orders, and reports.</p>
                    </div>
                </div>

                <form className="admin-login-form" onSubmit={handleSubmit}>
                    <label htmlFor="admin-email">Email</label>
                    <input
                        id="admin-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="admin007@gmail.com"
                        required
                    />

                    <label htmlFor="admin-password">Password</label>
                    <input
                        id="admin-password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="admin007"
                        required
                    />

                    <button type="submit">Login</button>
                </form>
            </section>
        </main>
    )
}

export default AdminLogin
