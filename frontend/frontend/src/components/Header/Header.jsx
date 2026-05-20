import React from "react";
import "./Header.css";
import heroBg from "../../assets/fitFuel.png";

// Landing hero for the cooked food ordering app. The background image is the main brand visual.
const Header = () => {
  return (
    <div
      className="header"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(7,28,20,0.92) 0%, rgba(7,28,20,0.65) 45%, rgba(7,28,20,0.2) 100%), url(${heroBg})`
      }}
    >
      <div className="header-contents">
        <p className="header-tagline">FitFuel. Fuel your potential.</p>
        <h2>Order fresh cooked fitness meals</h2>
        <p>
          Fresh meals from nearby Dhaka kitchen hubs with calories, protein, carbs, and fat details.
        </p>
        <button>Explore Food</button>
        <div className="header-stat-chips">
          <span>High Protein Meals</span>
          <span>Low Carb Options</span>
          <span>Dhaka Kitchen Hubs</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
