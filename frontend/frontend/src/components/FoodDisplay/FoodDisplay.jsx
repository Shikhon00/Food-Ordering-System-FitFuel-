import React, { useContext } from "react";
import "./FoodDisplay.css";
import { StoreContext } from "../../context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";

// Displays product cards. Category comes from ExploreMenu.
const FoodDisplay = ({ category }) => {
  const { food_list } = useContext(StoreContext);
  // "all" and "All Products" both mean no filtering.
  const filteredProducts = food_list.filter((item) => {
    if (category === "all" || category === "All Products") {
      return true;
    }

    return item.category === category;
  });

  return (
    <div className="food-display" id="food-display">
      <h2>Packed nutrition products for your fitness routine</h2>
      <p className="food-display-subtitle">
        Track calories and macros before adding products to your cart.
      </p>

      <div className="food-display-list">
        {filteredProducts.map((item,index) => (
          <FoodItem
            key={index}
            id={item._id}
            name={item.name}
            price={item.price}
            description={item.description}
            image={item.image}
            quantity={item.quantity}
            calories={item.calories}
            protein={item.protein}
            carbs={item.carbs}
            fat={item.fat}
            shelfLifeDays={item.shelfLifeDays}
          />
        ))}
      </div>
    </div>
  );
};

export default FoodDisplay;
