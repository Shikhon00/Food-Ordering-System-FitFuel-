import React from "react";
import "./Header.css";
import heroBg from "../../assets/fitFuel.png";

// Landing hero for the nutrition shop. The background image is the main brand visual.
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
        <h2>Choose your packed fitness nutrition products</h2>
        <p>
          Shop gym-friendly packed products with calories, protein, carbs, fat, and shelf life details.
        </p>
        <button>Explore Products</button>
        <div className="header-stat-chips">
          <span>High Protein Packs</span>
          <span>Low Carb Options</span>
          <span>Macro Tracking</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
