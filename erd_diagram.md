# 🥗 FitFuel — Complete Database Architecture & ERD

This is the exact database schema specification for the **FitFuel** project, detailing every model, field, and database relation found in the codebase.

---

## 📊 Entity Relationship Diagram (ERD)

Here is the exact schema relations of the project represented using Mermaid notation:

```mermaid
erDiagram
    USER ||--o{ ORDER : "places (userId string matching User._id)"
    USER ||--o{ FEEDBACK : "writes (userId ref User)"
    FOOD ||--o{ FEEDBACK : "receives (foodId ref Food)"
    ORDER ||--o{ FEEDBACK : "reviewed in (orderId ref Order)"
    
    %% Note: Assigned delivery partner is snapshotted inside the Order model.
    %% Active order is referenced via currentOrderId string.
    DELIVERY_PARTNER ||--o| ORDER : "has active assignment (currentOrderId)"
    ORDER ||--o| DELIVERY_PARTNER : "embeds assigned partner info"

    USER {
        ObjectId _id PK
        string name "required"
        string email UK "required"
        string password "required"
        object cartData "default: {}"
        string resetOtp "default: ''"
        number resetOtpExpire "default: 0"
    }

    FOOD {
        ObjectId _id PK
        string name "required"
        string description "required"
        number price "required"
        string image "required"
        string category "required"
        number quantity "required"
        number calories "required, min: 0"
        number protein "required, min: 0"
        number carbs "required, min: 0"
        number fat "required, min: 0"
        number shelfLifeDays "default: 1"
    }

    ORDER {
        ObjectId _id PK
        string userId FK "required (String representation of User._id)"
        array items "required (Snapshot array of purchased food items)"
        number amount "required"
        nutritionSchema nutritionTotals "default: {} (Embedded macro sums)"
        object address "required (Shipping info)"
        string status "default: 'Food Processing'"
        string paymentStatus "default: 'Pending'"
        date date "default: Date.now"
        boolean payment "default: false"
        boolean confirmationEmailSent "default: false"
        string cancellationReason "default: ''"
        number cancellationRefundPercentage "default: 0"
        number cancellationRefundAmount "default: 0"
        date cancelledAt
        boolean stockRestored "default: false"
        object assignedDeliveryPartner "default: null (Embedded rider snapshot)"
        string deliveryStatus "default: 'Waiting for assignment'"
        array deliveryTimeline "default: []"
        boolean deliveryReviewRequired "default: false"
        string deliveryIssueReason "default: ''"
        date deliveryFailedAt
        boolean riderReported "default: false"
        string riderReportReason "default: ''"
        date riderReportedAt
        string refundNotice "default: ''"
        date refundNoticeAt
        boolean refundProcessed "default: false"
        date refundProcessedAt
    }

    FEEDBACK {
        ObjectId _id PK
        ObjectId userId FK "required, ref: 'user'"
        ObjectId foodId FK "required, ref: 'food'"
        ObjectId orderId FK "required, ref: 'order'"
        number rating "required, min: 1, max: 5"
        string comment "required"
        string userName "default: ''"
        date createdAt "timestamps: true"
        date updatedAt "timestamps: true"
    }

    DELIVERY_PARTNER {
        ObjectId _id PK
        string name "required"
        string email UK "required"
        string password "required"
        string phone "required"
        string vehicleType "default: 'Bike'"
        string status "default: 'Pending Approval'"
        string availability "default: 'Offline'"
        string currentOrderId "default: '' (String of Order._id)"
        string lastKnownLocation "default: 'Uttara Sector 10'"
        number warningCount "default: 0"
        number failedDeliveries "default: 0"
        number reportCount "default: 0"
        string lastWarningReason "default: ''"
        date createdAt "timestamps: true"
        date updatedAt "timestamps: true"
    }

    ADMIN {
        ObjectId _id PK
        string email UK "required"
        string password "required"
    }
```

---

## 📂 Detailed Collection Specifications

### 1. `USER` Collection
* **Source**: [userModel.js](file:///c:/Users/User/OneDrive/Documents/MREN/FoodOrderingSystem/backend/models/userModel.js)
* **Configuration**: `{ minimize: false }` (Preserves empty objects like empty `cartData` in MongoDB).

### 2. `FOOD` Collection
* **Source**: [foodModel.js](file:///c:/Users/User/OneDrive/Documents/MREN/FoodOrderingSystem/backend/models/foodModel.js)
* **Nutritional Macros**: Stored alongside menu details to power user calorie/macro logging metrics.

### 3. `ORDER` Collection
* **Source**: [orderModel.js](file:///c:/Users/User/OneDrive/Documents/MREN/FoodOrderingSystem/backend/models/orderModel.js)
* **Embedded Sub-schemas**:
  * **`nutritionTotals`**: Embeds a `nutritionSchema` containing totals for `calories`, `protein`, `carbs`, and `fat`.
  * **`items`**: Snapshots ordered items from the `FOOD` collection (stores `_id`, `name`, `price`, `quantity`, and macros at order time).
  * **`assignedDeliveryPartner`**: Snapshot of the assigned rider's details.

### 4. `FEEDBACK` Collection
* **Source**: [feedbackModel.js](file:///c:/Users/User/OneDrive/Documents/MREN/FoodOrderingSystem/backend/models/feedbackModel.js)
* **Indices**:
  * Compound index `{ userId: 1, foodId: 1, orderId: 1 }` configured as `{ unique: true }`. This strictly enforces that a customer can only submit one feedback per food item per order context.

### 5. `DELIVERY_PARTNER` Collection
* **Source**: [deliveryPartnerModel.js](file:///c:/Users/User/OneDrive/Documents/MREN/FoodOrderingSystem/backend/models/deliveryPartnerModel.js)
* **Configuration**: `{ timestamps: true }` (adds `createdAt` and `updatedAt`).

### 6. `ADMIN` Collection
* **Source**: [adminModel.js](file:///c:/Users/User/OneDrive/Documents/MREN/FoodOrderingSystem/backend/models/adminModel.js)
