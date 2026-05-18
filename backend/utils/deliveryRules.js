const PACKED_PRODUCT_DELIVERY_WINDOW_MINUTES = 72 * 60;
const PACKED_PICKUP_LIMIT_MINUTES = 24 * 60;

// Delivery helpers live here so order, admin, and rider controllers all follow
// the same rules for ETA, deadlines, warnings, and failed deliveries.
const BANGLADESH_DIVISIONS = [
    "Dhaka",
    "Chattogram",
    "Rajshahi",
    "Khulna",
    "Barishal",
    "Sylhet",
    "Rangpur",
    "Mymensingh",
];

const AREA_ETA_RULES = [
    { keywords: ["uttara", "sector 10", "sector-10"], eta: "20-35 min", minutes: 35 },
    { keywords: ["airport", "khilkhet", "nikunja"], eta: "30-50 min", minutes: 50 },
    { keywords: ["banani", "gulshan", "bashundhara"], eta: "35-55 min", minutes: 55 },
    { keywords: ["mirpur", "badda", "mohakhali"], eta: "45-70 min", minutes: 70 },
    { keywords: ["dhanmondi", "mohammadpur", "tejgaon"], eta: "60-90 min", minutes: 90 },
    { keywords: ["old dhaka", "jatrabari", "wari"], eta: "90-120 min", minutes: 120 },
];

// We normalize area names so "Uttara", "uttara", and " Uttara " match equally.
const normalizeArea = (area = "") => String(area).trim().toLowerCase();

// For Dhaka areas, this picks the closest ETA rule by matching common keywords.
const getEtaForArea = (area = "") => {
    const normalizedArea = normalizeArea(area);
    const matchedRule = AREA_ETA_RULES.find((rule) =>
        rule.keywords.some((keyword) => normalizedArea.includes(keyword))
    );

    return matchedRule || { eta: "45-75 min", minutes: 75 };
};

// For orders outside Dhaka, division-level ETA is easier to explain and maintain.
const getEtaForDivision = (division = "") => {
    const etaByDivision = {
        Dhaka: { eta: "Same day to 1 day", minutes: 24 * 60 },
        Chattogram: { eta: "2-3 days", minutes: 72 * 60 },
        Rajshahi: { eta: "2-3 days", minutes: 72 * 60 },
        Khulna: { eta: "2-3 days", minutes: 72 * 60 },
        Barishal: { eta: "2-3 days", minutes: 72 * 60 },
        Sylhet: { eta: "2-3 days", minutes: 72 * 60 },
        Rangpur: { eta: "2-3 days", minutes: 72 * 60 },
        Mymensingh: { eta: "2-3 days", minutes: 72 * 60 },
    };

    return etaByDivision[division] || null;
};

const isSupportedDivision = (division = "") => BANGLADESH_DIVISIONS.includes(division);

// Builds the delivery information shown to customers and admins.
// It also tells us if a rider missed the pickup deadline.
const getDeliveryMeta = (order, now = new Date()) => {
    const division = order?.address?.division || "Dhaka";
    const etaRule = getEtaForDivision(division) || getEtaForArea(order?.address?.area || order?.address?.city || "");
    const orderDate = new Date(order?.date || now);
    const deliveryDeadline = new Date(orderDate.getTime() + PACKED_PRODUCT_DELIVERY_WINDOW_MINUTES * 60 * 1000);
    const pickupDeadline = new Date(orderDate.getTime() + PACKED_PICKUP_LIMIT_MINUTES * 60 * 1000);
    const isPickupLate =
        now > pickupDeadline &&
        Boolean(order?.assignedDeliveryPartner) &&
        ["Assigned", "Accepted", "Waiting for assignment"].includes(order?.deliveryStatus || "Waiting for assignment") &&
        !["Delivered", "Cancelled", "Payment Cancelled", "Expired", "Delivery Failed"].includes(order?.status);

    return {
        estimatedDeliveryTime: etaRule.eta,
        estimatedDeliveryMinutes: etaRule.minutes,
        deliveryDeadline,
        pickupDeadline,
        deliveryMode: "Packed fitness product",
        serviceArea: `${division}, Bangladesh`,
        isPickupLate,
        isExpired: false,
    };
};

// Mongoose documents have extra methods, so this safely converts them before
// adding deliveryMeta to the response object sent to the frontend.
const attachDeliveryMeta = (order, now = new Date()) => {
    const plainOrder = typeof order.toObject === "function" ? order.toObject() : order;
    return {
        ...plainOrder,
        deliveryMeta: getDeliveryMeta(plainOrder, now),
    };
};

// Used when an order is closed because its delivery window is over.
const markExpiredOrder = async (order, note = "Delivery window expired") => {
    order.status = "Expired";
    order.deliveryStatus = "Expired";
    order.cancellationReason = note;
    order.cancelledAt = new Date();
    order.deliveryTimeline = [
        ...(order.deliveryTimeline || []),
        {
            label: "Expired",
            note,
            time: new Date(),
        },
    ];

    await order.save();
    return order;
};

// A rider warning is used for missed pickup/deadline issues.
// After 3 warnings the rider is moved back to admin approval.
const applyRiderWarning = async (partner, reason, failedDelivery = false) => {
    if (!partner) {
        return null;
    }

    partner.warningCount = Number(partner.warningCount || 0) + 1;
    partner.failedDeliveries = Number(partner.failedDeliveries || 0) + (failedDelivery ? 1 : 0);
    partner.lastWarningReason = reason;
    partner.availability = "Free";
    partner.currentOrderId = "";

    if (partner.warningCount >= 3) {
        partner.status = "Pending Approval";
        partner.availability = "Offline";
    }

    await partner.save();
    return partner;
};

// If the rider accepts but does not pick up in time, admin needs to review it.
const markPickupDelayed = async (order, partner = null) => {
    const reason = "Pickup deadline missed. Admin review required before this order continues.";

    order.status = "Needs Admin Review";
    order.deliveryStatus = "Pickup Delayed";
    order.deliveryReviewRequired = true;
    order.deliveryIssueReason = reason;
    order.deliveryTimeline = [
        ...(order.deliveryTimeline || []),
        {
            label: "Pickup Delayed",
            note: reason,
            time: new Date(),
        },
    ];

    await order.save();
    await applyRiderWarning(partner, reason, false);
    return order;
};

// If the package is already in transit and the delivery deadline passes,
// the order is marked as failed so admin can decide refund/remake/contact.
const markDeliveryFailed = async (order, partner = null, note = "Delivery deadline missed. Admin must refund, remake, or contact the customer.") => {
    order.status = "Delivery Failed";
    order.deliveryStatus = "Delivery Failed";
    order.deliveryReviewRequired = true;
    order.deliveryIssueReason = note;
    order.deliveryFailedAt = new Date();
    order.deliveryTimeline = [
        ...(order.deliveryTimeline || []),
        {
            label: "Delivery Failed",
            note,
            time: new Date(),
        },
    ];

    await order.save();
    await applyRiderWarning(partner, note, true);
    return order;
};

export {
    BANGLADESH_DIVISIONS,
    PACKED_PRODUCT_DELIVERY_WINDOW_MINUTES,
    PACKED_PICKUP_LIMIT_MINUTES,
    applyRiderWarning,
    attachDeliveryMeta,
    getDeliveryMeta,
    getEtaForArea,
    isSupportedDivision,
    markDeliveryFailed,
    markExpiredOrder,
    markPickupDelayed,
};
