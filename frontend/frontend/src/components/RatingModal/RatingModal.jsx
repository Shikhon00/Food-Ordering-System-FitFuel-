import React from "react";
import "./RatingModal.css";

// Shared star renderer. In view mode it is disabled; in form mode it is clickable.
const renderStars = (value = 0, interactive = false, onSelect = () => {}) => {
  const roundedValue = interactive ? value : Math.round(value);

  return (
    <div className={`rating-stars ${interactive ? "interactive" : ""}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= roundedValue ? "filled" : ""}
          onClick={interactive ? () => onSelect(star) : undefined}
          disabled={!interactive}
        >
          ★
        </button>
      ))}
    </div>
  );
};

// Modal supports three modes:
// view = read product reviews, orderItems = choose delivered item, form = write/edit review.
const RatingModal = ({
  isOpen,
  mode = "view",
  onClose,
  product,
  averageRating = 0,
  totalReviews = 0,
  feedbacks = [],
  isLoadingReviews = false,
  order,
  orderFeedbackMap = {},
  onSelectReviewItem,
  onBack,
  formData = { rating: 0, comment: "" },
  onFormChange,
  onRatingSelect,
  onSubmit,
  isSaving = false,
  notice = "",
}) => {
  // Returning null is the React way to keep a modal hidden without rendering markup.
  if (!isOpen) {
    return null;
  }

  // Same product summary is reused in review viewing and writing screens.
  const productDetails = product ? (
    <div className="rating-modal-product">
      <img src={product.image} alt={product.name} />
      <div className="rating-modal-product-copy">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="rating-modal-price">Tk {product.price}</div>
        <div className="rating-modal-macros">
          <span>{product.calories} kcal</span>
          <span>Protein {product.protein}g</span>
          <span>Carbs {product.carbs}g</span>
          <span>Fat {product.fat}g</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className={`rating-modal-card ${mode}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="rating-modal-close" onClick={onClose}>
          ×
        </button>

        {/* Public product review mode. */}
        {mode === "view" ? (
          <>
            <div className="rating-modal-header">
              <div>
                <p className="rating-modal-eyebrow">Customer Reviews</p>
                <h2>Average Rating</h2>
              </div>
              <div className="rating-modal-average">
                {renderStars(averageRating)}
                <strong>{averageRating.toFixed(1)}</strong>
                <span>{totalReviews} reviews</span>
              </div>
            </div>

            {productDetails}

            <p className="rating-modal-note">
              Your feedback helps other FitFuel members choose better nutrition products.
            </p>

            <div className="rating-modal-review-list">
              {isLoadingReviews ? (
                <p className="rating-modal-empty">Loading reviews...</p>
              ) : feedbacks.length ? (
                feedbacks.map((feedback, index) => (
                  <div key={`${feedback.userName}-${feedback.createdAt}-${index}`} className="rating-modal-review">
                    <div className="rating-modal-review-head">
                      <strong>{feedback.userName || "FitFuel Member"}</strong>
                      <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="rating-modal-review-rating">
                      {renderStars(Number(feedback.rating || 0))}
                    </div>
                    <p>{feedback.comment}</p>
                  </div>
                ))
              ) : (
                <p className="rating-modal-empty">No reviews yet</p>
              )}
            </div>
          </>
        ) : null}

        {/* Customer chooses which delivered order item to review. */}
        {mode === "orderItems" ? (
          <>
            <div className="rating-modal-header">
              <div>
                <p className="rating-modal-eyebrow">Write Feedback</p>
                <h2>Give Feedback</h2>
              </div>
              <p className="rating-modal-subtitle">
                Review delivered FitFuel products from this order.
              </p>
            </div>

            {notice ? <p className="rating-modal-notice">{notice}</p> : null}

            <div className="rating-modal-order-list">
              {(order?.items || []).map((item) => {
                // Existing feedback lets the button show Edit Review instead of Review Item.
                const existingFeedback = orderFeedbackMap[String(item._id)];

                return (
                  <div key={String(item._id)} className="rating-modal-order-item">
                    <img src={item.image} alt={item.name} />
                    <div className="rating-modal-order-copy">
                      <h3>{item.name}</h3>
                      <p>Quantity: {item.quantity}</p>
                      <div className="rating-modal-macros compact">
                        <span>{item.calories} kcal</span>
                        <span>Protein {item.protein}g</span>
                        <span>Carbs {item.carbs}g</span>
                        <span>Fat {item.fat}g</span>
                      </div>
                      <p className="rating-modal-feedback-status">
                        {existingFeedback ? `Already reviewed: ${existingFeedback.rating}/5` : "No feedback submitted yet"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rating-modal-action"
                      onClick={() => onSelectReviewItem(item, existingFeedback)}
                    >
                      {existingFeedback ? "Edit Review" : "Review Item"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {/* Actual feedback form with rating and comment. */}
        {mode === "form" ? (
          <>
            <div className="rating-modal-header">
              <div>
                <p className="rating-modal-eyebrow">Write Feedback</p>
                <h2>Review Item</h2>
              </div>
              <button type="button" className="rating-modal-back" onClick={onBack}>
                Back
              </button>
            </div>

            {productDetails}

            {notice ? <p className="rating-modal-notice">{notice}</p> : null}

            <div className="rating-modal-form">
              <label>
                <span>Average Rating</span>
                {renderStars(formData.rating, true, onRatingSelect)}
              </label>

              <label>
                <span>Write Feedback</span>
                <textarea
                  value={formData.comment}
                  onChange={(event) => onFormChange(event.target.value)}
                  placeholder="Share taste, quality, convenience, and how this FitFuel product supported your routine."
                  rows="5"
                />
              </label>

              <button type="button" className="rating-modal-submit" onClick={onSubmit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Feedback"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default RatingModal;
