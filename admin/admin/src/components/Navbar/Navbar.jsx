import React, { useState } from "react";
import './Navbar.css'
import {assets} from '../../assets/assets'
import { toast } from 'react-toastify'

// Admin top bar with profile editor and logout.
const Navbar = ({ adminEmail, onSaveProfile, onLogout }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    email: adminEmail,
    password: '',
    confirmPassword: '',
  });

  // Shared input handler for profile form fields.
  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  // Opens/closes profile menu and resets password fields each time.
  const handleProfileToggle = () => {
    setProfileData({
      email: adminEmail,
      password: '',
      confirmPassword: '',
    });
    setShowProfile((currentValue) => !currentValue);
  };

  // Validates profile form before saving new admin credentials.
  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    const email = profileData.email.trim();

    if (!email) {
      toast.error('Admin email is required');
      return;
    }

    if (!profileData.password || profileData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (profileData.password !== profileData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const result = await onSaveProfile({
      email,
      password: profileData.password,
    });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setProfileData({
      email,
      password: '',
      confirmPassword: '',
    });
    setShowProfile(false);
    toast.success(result.message || 'Admin profile updated');
  };

  return (
    <div className='navbar'>
        <div className='logo'>
            <span className='logo-icon'>F</span>
            <span>FitFuel</span><b>.</b>
        </div>
        <div className='navbar-copy'>
            <p>Admin Console</p>
            <span>{adminEmail}</span>
        </div>
        <div className="profile-area">
          <button className="profile-button" type="button" onClick={handleProfileToggle} aria-label="Open admin profile">
              <img className='profile' src={assets.profile_image} alt="" />
          </button>
          {showProfile && (
            <div className="profile-menu">
              <div className="profile-menu-header">
                <p>Admin Profile</p>
                <span>Update login credentials</span>
              </div>

              <form onSubmit={handleProfileSubmit} className="profile-form">
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                />

                <label htmlFor="profile-password">New Password</label>
                <input
                  id="profile-password"
                  name="password"
                  type="password"
                  value={profileData.password}
                  onChange={handleProfileChange}
                  required
                />

                <label htmlFor="profile-confirm-password">Confirm Password</label>
                <input
                  id="profile-confirm-password"
                  name="confirmPassword"
                  type="password"
                  value={profileData.confirmPassword}
                  onChange={handleProfileChange}
                  required
                />

                <button className="save-profile" type="submit">Save Changes</button>
              </form>

              <button className="logout-button" type="button" onClick={onLogout}>Logout</button>
            </div>
          )}
        </div>
    </div>
  )
}

export default Navbar
