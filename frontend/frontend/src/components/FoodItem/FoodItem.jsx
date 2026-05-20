import React, {useContext, useEffect, useState } from "react";
import "./FoodItem.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import RatingModal from "../RatingModal/RatingModal";

// One food card shown in the menu. It handles stock display, cart controls,
// macro information, and public feedback summary.
const FoodItem = ({id, name, price, description, image, quantity, calories, protein, carbs, fat, shelfLifeDays = 1 }) => {
  
  const {cartItems,addToCart,removeFromCart,url}=useContext(StoreContext);
  const isOutOfStock = quantity === 0;
  const hasReachedLimit = (cartItems[id] || 0) >= quantity;
  // Rating summary is loaded from backend for the review popup and card display.
  const [ratingSummary, setRatingSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    feedbacks: [],
  });
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const averageRating = Number(ratingSummary.averageRating || 0);
  const isTopRated = averageRating >= 4;

  // Loads average rating and review list for this food.
  const loadFoodFeedback = async () => {
    setIsLoadingReviews(true);
    try {
      const response = await axios.get(`${url}/api/feedback/food/${id}`);

      if (response.data.success) {
        setRatingSummary({
          averageRating: Number(response.data.averageRating || 0),
          totalReviews: Number(response.data.totalReviews || 0),
          feedbacks: response.data.feedbacks || [],
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadFoodFeedback();
  }, [id]);

  // Refresh reviews every time modal opens so latest feedback appears.
  const openRatingModal = () => {
    setIsRatingModalOpen(true);
    loadFoodFeedback();
  };

  return (
    <>
      <div className="food-item">
        <div className="food-item-img-container">
          <img className="food-item-image" src={url+"/images/"+image} alt={name} />
          {isTopRated ? <div className="top-rated-badge">⭐ Top Rated</div> : null}
          {isOutOfStock ? <span className="food-item-stock-badge">Unavailable</span> : null}

          {/* If item is not in cart, show one add button; otherwise show counter controls. */}
          {!cartItems[id] ? (
            <img
              className={`add ${isOutOfStock ? "disabled" : ""}`}
              onClick={() => !isOutOfStock && addToCart(id)}
              src={assets.add_icon_white}
              alt="Add"
            />
          ) : (
            <div className="food-item-counter">
              <img
                onClick={() => removeFromCart(id)}
                src={assets.remove_icon_red}
                alt="Remove"
              />
              <p>{cartItems[id]}</p>
              <img
                className={hasReachedLimit ? "disabled-counter-action" : ""}
                onClick={() => !hasReachedLimit && addToCart(id)}
                src={assets.add_icon_green}
                alt="Add"
              />
            </div>
          )}
        </div>

        <div className="food-item-info">
          <div className="food-item-name-rating">
            <p>{name}</p>
            <button type="button" className="food-item-rating-button" onClick={openRatingModal}>
              <span className="food-item-rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= Math.round(averageRating) ? "filled" : ""}
                  >
                    ★
                  </span>
                ))}
              </span>
              <div className="rating-display">⭐ {averageRating.toFixed(1)}</div>
              <span className="food-item-rating-value">
                {ratingSummary.totalReviews ? averageRating.toFixed(1) : "0.0"}
              </span>
              <small>{ratingSummary.totalReviews ? `${ratingSummary.totalReviews} reviews` : "No reviews yet"}</small>
            </button>
          </div>

          <p className="food-item-desc">{description}</p>
          <p className="food-item-price">Tk {price}</p>
          <div className="food-item-macros">
            <span>Calories: {calories} kcal</span>
            <span>Protein: {protein}g</span>
            <span>Carbs: {carbs}g</span>
            <span>Fat: {fat}g</span>
            <span>Best Within: {shelfLifeDays} days</span>
          </div>
          <p className="food-item-stock">Stock: {quantity}</p>
        </div>
      </div>
      <RatingModal
        isOpen={isRatingModalOpen}
        mode="view"
        onClose={() => setIsRatingModalOpen(false)}
        product={{
          name,
          description,
          image: `${url}/images/${image}`,
          price,
          calories,
          protein,
          carbs,
          fat,
          shelfLifeDays,
        }}
        averageRating={ratingSummary.averageRating}
        totalReviews={ratingSummary.totalReviews}
        feedbacks={ratingSummary.feedbacks}
        isLoadingReviews={isLoadingReviews}
      />
    </>
  );
};

export default FoodItem;
