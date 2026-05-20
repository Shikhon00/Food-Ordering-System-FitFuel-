import React, { useContext, useEffect, useMemo } from "react";
import "./ExploreMenu.css";
import { category_images } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";

// Category selector. Clicking a category filters the food list on Home page.
const ExploreMenu = ({ category, setCategory }) => {
  const { food_list } = useContext(StoreContext);

  // Build filters from the same food categories admin sees in the inventory list.
  const menuItems = useMemo(() => {
    const liveCategories = [...new Set((food_list || []).map((item) => item.category).filter(Boolean))].sort();

    return [
      { menu_name: "All Food", menu_image: category_images["All Food"] },
      ...liveCategories.map((categoryName) => ({
        menu_name: categoryName,
        menu_image: category_images[categoryName] || category_images["All Food"],
      })),
    ];
  }, [food_list]);

  // If admin removes the selected category, fall back to all food.
  useEffect(() => {
    const categoryExists = category === "all" || menuItems.some((item) => item.menu_name === category);
    if (!categoryExists) {
      setCategory("all");
    }
  }, [category, menuItems, setCategory]);

  return (
    <div className="explore-menu" id="explore-menu">
      <h1>Choose food by category</h1>
      <p className="explore-menu-text">
        These filters come from the food categories in admin inventory, so the menu stays matched with your live food list.
      </p>

      <div className="explore-menu-list">
        {menuItems.map((item, index) => {
          // Active state highlights the currently selected category image.
          const active = category === item.menu_name || (category === "all" && item.menu_name === "All Food");

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
