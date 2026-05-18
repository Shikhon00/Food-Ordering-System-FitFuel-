import React, { useContext, useEffect, useState } from 'react'
import './LoginPopup.css'
import { assets } from '../../assets/assets'
import { StoreContext } from '../../context/StoreContext'
import axios from "axios"

const ADMIN_PANEL_URL = "http://localhost:5174"

const ROLE_OPTIONS = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
    { value: "delivery", label: "Delivery Partner" },
]

// One popup handles user, admin, and delivery partner login flows.
const LoginPopup = ({ setShowLogin, onAuthMessage, initialRole = "user" }) => {
    const { url, setToken } = useContext(StoreContext)
    const [selectedRole, setSelectedRole] = useState(initialRole)
    const [currState, setCurrState] = useState("Login")
    const [data, setData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        vehicleType: "Bike",
        otp: "",
        newPassword: ""
    })

    // Reset form whenever user switches between User/Admin/Delivery tabs.
    const resetFormState = (role) => {
        setSelectedRole(role)
        setCurrState("Login")
        setData({
            name: "",
            email: "",
            password: "",
            phone: "",
            vehicleType: "Bike",
            otp: "",
            newPassword: ""
        })
    }

    useEffect(() => {
        resetFormState(initialRole)
    }, [initialRole])

    const onChangeHandler = (event) => {
        const name = event.target.name
        const value = event.target.value
        setData((prevData) => ({ ...prevData, [name]: value }))
    }

    // Admin login redirects to the separate admin app on localhost:5174.
    const loginAdmin = async () => {
        const response = await axios.post(url + "/api/admin/login", {
            email: data.email,
            password: data.password,
        })

        if (!response.data.success) {
            onAuthMessage?.(response.data.message || "Admin login failed", "error")
            return
        }

        const adminEmail = encodeURIComponent(response.data.email)
        window.location.href = `${ADMIN_PANEL_URL}/?admin=1&email=${adminEmail}&login=success`
    }

    // Handles user login, signup, forgot password, OTP verify, and reset password.
    const handleUserAuth = async () => {
        let newUrl = url

        if (currState === "Login") {
            newUrl += "/api/user/login"
        }
        else if (currState === "Sign Up") {
            newUrl += "/api/user/register"
        }
        else if (currState === "Forgot Password") {
            newUrl += "/api/user/forgot-password"
        }
        else if (currState === "Verify OTP") {
            newUrl += "/api/user/verify-otp"
        }
        else {
            newUrl += "/api/user/reset-password"
        }

        // Build only the fields needed for the current auth step.
        const payload =
            currState === "Login" ? { email: data.email, password: data.password } :
            currState === "Sign Up" ? { name: data.name, email: data.email, password: data.password } :
            currState === "Forgot Password" ? { email: data.email } :
            currState === "Verify OTP" ? { email: data.email, otp: data.otp } :
            { email: data.email, newPassword: data.newPassword }

        const response = await axios.post(newUrl, payload)

        if (response.data.success && (currState === "Login" || currState === "Sign Up")) {
            setToken(response.data.token)
            localStorage.setItem("token", response.data.token)
            onAuthMessage?.(currState === "Login" ? "Login successful" : "Account created successfully")
            setShowLogin(false)
        }
        else if (response.data.success && currState === "Forgot Password") {
            onAuthMessage?.(response.data.message)
            setCurrState("Verify OTP")
        }
        else if (response.data.success && currState === "Verify OTP") {
            onAuthMessage?.(response.data.message)
            setCurrState("Reset Password")
        }
        else if (response.data.success && currState === "Reset Password") {
            onAuthMessage?.(response.data.message)
            setCurrState("Login")
            setData((prev) => ({ ...prev, password: "", otp: "", newPassword: "" }))
        }
        else {
            onAuthMessage?.(response.data.message, "error")
        }
    }

    // Delivery partners can register, then admin must approve before real work starts.
    const handleDeliveryAuth = async () => {
        const endpoint = currState === "Login" ? "/api/delivery/login" : "/api/delivery/register"
        const payload =
            currState === "Login"
                ? { email: data.email, password: data.password }
                : {
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    phone: data.phone,
                    vehicleType: data.vehicleType
                }

        const response = await axios.post(url + endpoint, payload)

        if (!response.data.success) {
            onAuthMessage?.(response.data.message || "Delivery account action failed", "error")
            return
        }

        onAuthMessage?.(response.data.message)

        // Delivery registration needs admin approval, so only login receives a working panel token.
        if (response.data.token) {
            localStorage.setItem("deliveryToken", response.data.token)
            window.dispatchEvent(new Event("fitfuel:delivery-session-changed"))
            setShowLogin(false)
            window.location.href = "/delivery"
        }
        else {
            setCurrState("Login")
        }
    }

    // Submit delegates to the correct auth function based on selected role.
    const onSubmitHandler = async (event) => {
        event.preventDefault()

        if (selectedRole === "admin") {
            await loginAdmin()
            return
        }

        if (selectedRole === "delivery") {
            await handleDeliveryAuth()
            return
        }

        await handleUserAuth()
    }

    // Admin account is managed separately, so only user/delivery can sign up here.
    const canCreateAccount = selectedRole === "user" || selectedRole === "delivery"
    const title =
        selectedRole === "admin" ? "Admin Login" :
        selectedRole === "delivery" ? `Delivery Partner ${currState}` :
        currState

    return (
        <div className='login-popup'>
            <form onSubmit={onSubmitHandler} className="login-popup-container">
                <div className="login-popup-title">
                    <h2>{title}</h2>
                    <img onClick={() => setShowLogin(false)} src={assets.cross_icon} alt="" />
                </div>

                <div className="login-role-tabs">
                    {ROLE_OPTIONS.map((role) => (
                        <button
                            key={role.value}
                            type="button"
                            className={selectedRole === role.value ? "active" : ""}
                            onClick={() => resetFormState(role.value)}
                        >
                            {role.label}
                        </button>
                    ))}
                </div>

                <div className="login-popup-inputs">
                    {currState === "Sign Up" && selectedRole !== "admin" ? (
                        <input name='name' onChange={onChangeHandler} value={data.name} type="text" placeholder='Full name' required />
                    ) : null}

                    {currState === "Sign Up" && selectedRole === "delivery" ? (
                        <>
                            <input name='phone' onChange={onChangeHandler} value={data.phone} type="text" placeholder='Phone number' required />
                            <select name='vehicleType' onChange={onChangeHandler} value={data.vehicleType}>
                                <option>Bike</option>
                                <option>Cycle</option>
                                <option>Scooter</option>
                            </select>
                        </>
                    ) : null}

                    <input name='email' onChange={onChangeHandler} value={data.email} type="email" placeholder='Email address' required />

                    {currState === "Login" || currState === "Sign Up" || selectedRole === "admin" ? (
                        <input name='password' onChange={onChangeHandler} value={data.password} type="password" placeholder='Password' required />
                    ) : null}

                    {currState === "Verify OTP" ? (
                        <input name='otp' onChange={onChangeHandler} value={data.otp} type="text" maxLength="6" placeholder='Enter 6-digit OTP' required />
                    ) : null}

                    {currState === "Reset Password" ? (
                        <input name='newPassword' onChange={onChangeHandler} value={data.newPassword} type="password" placeholder='Enter new password' required />
                    ) : null}
                </div>

                <button type='submit'>
                    {currState === "Sign Up" ? "Create account" :
                     currState === "Forgot Password" ? "Send OTP" :
                     currState === "Verify OTP" ? "Verify OTP" :
                     currState === "Reset Password" ? "Reset Password" :
                     "Login"}
                </button>

                {currState === "Login" || currState === "Sign Up" ? (
                    <div className="login-popup-condition">
                        <input type="checkbox" required />
                        <p>By continuing, I agree to the terms of use and privacy policy.</p>
                    </div>
                ) : null}

                {currState === "Login" && canCreateAccount ? (
                    <p>
                        Create a new {selectedRole === "delivery" ? "delivery partner" : "user"} account?{" "}
                        <span onClick={() => setCurrState("Sign Up")}>Click here</span>
                    </p>
                ) : null}

                {currState === "Login" && selectedRole === "user" ? (
                    <p>Forgot Password? <span onClick={() => setCurrState("Forgot Password")}>Reset here</span></p>
                ) : null}

                {currState === "Sign Up" && canCreateAccount ? (
                    <p>Already have an account? <span onClick={() => setCurrState("Login")}>Login here</span></p>
                ) : null}

                {currState === "Forgot Password" || currState === "Verify OTP" || currState === "Reset Password" ? (
                    <p>Back to login? <span onClick={() => setCurrState("Login")}>Login here</span></p>
                ) : null}
            </form>
        </div>
    )
}

export default LoginPopup
