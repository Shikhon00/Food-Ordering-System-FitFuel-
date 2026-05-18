import React from "react";
import "./ExploreMenu.css";
import { menu_list } from "../../assets/assets";

// Category selector. Clicking a category filters the product list on Home page.
const ExploreMenu = ({ category, setCategory }) => {
  return (
    <div className="explore-menu" id="explore-menu">
      <h1>Choose your packed fitness nutrition products</h1>
      <p className="explore-menu-text">
        Shop gym-friendly packed products with calories, protein, carbs, fat, and shelf life details.
      </p>

      <div className="explore-menu-list">
        {menu_list.map((item, index) => {
          // Active state highlights the currently selected category image.
          const active = category === item.menu_name || (category === "all" && item.menu_name === "All Products");

          return (
            <div
              key={index}
              onClick={() => setCategory((prev) => (prev === item.menu_name ? "all" : item.menu_name))}
              className="explore-menu-list-item"
            >
              <img className={active ? "active" : ""} src={item.menu_image} alt={item.menu_name} />
              <p>{item.menu_name}</p>
            </div>
          );
        })}
      </div>

      <hr />
    </div>
  );
};

export default ExploreMenu;
