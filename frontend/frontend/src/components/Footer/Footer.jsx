import React from "react";
import "./Footer.css";
import { assets } from "../../assets/assets";

const Footer = () => {
  return (
    <div className="footer" id="footer">
      <div className="footer-content">
        <div className="footer-content-left">
          <div className="logo footer-logo">
            <span className="logo-icon">⚡</span>
            <span>FitFuel</span><b>.</b>
          </div>
          <p>Fitness-focused packed products, macro tracking, and smart nutrition for every goal.</p>

          <div className="footer-social-icons">
            <img src={assets.facebook_icon} alt="Facebook" />
            <img src={assets.twitter_icon} alt="Twitter" />
            <img src={assets.linkedin_icon} alt="LinkedIn" />
          </div>
        </div>

        <div className="footer-content-center">
          <h2>Nutrition Hub</h2>
          <ul>
            <li>Home</li>
            <li>About</li>
            <li>Nutrition History</li>
            <li>Privacy Policy</li>
          </ul>
        </div>

        <div className="footer-content-center">
          <h2>Products</h2>
          <ul>
            <li>High Protein</li>
            <li>Bulking</li>
            <li>Weight Loss</li>
            <li>Recovery</li>
          </ul>
        </div>

        <div className="footer-content-right">
          <h2>Get in Touch</h2>
          <ul>
            <li>+880 1991 XXXXXX</li>
            <li>hello@fitfuel.com</li>
            <li>Privacy Policy</li>
          </ul>
        </div>
      </div>
      <p className="footer-copyright">Copyright 2025 © FitFuel - All Rights Reserved</p>
    </div>
  );
};

export default Footer;
