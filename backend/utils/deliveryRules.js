const COOKED_FOOD_DELIVERY_WINDOW_MINUTES = 60;
const COOKED_FOOD_PICKUP_LIMIT_MINUTES = 20;

// Five kitchen hubs keep cooked food delivery realistic across most of Dhaka.
// The checkout form uses the same zones/areas so users cannot choose unsupported places.
const DELIVERY_ZONES = [
    {
        zoneName: "Uttara Zone",
        hubName: "Uttara Kitchen Hub",
        hubAddress: "FitFuel Uttara Kitchen Hub, Sector 10, Uttara, Dhaka",
        eta: "30-45 min",
        minutes: 45,
        areas: ["Uttara", "Airport", "Khilkhet", "Nikunja", "Dakshinkhan", "Azampur", "Abdullahpur", "Turag"],
    },
    {
        zoneName: "Mirpur Zone",
        hubName: "Mirpur Kitchen Hub",
        hubAddress: "FitFuel Mirpur Kitchen Hub, Mirpur 10, Dhaka",
        eta: "30-50 min",
        minutes: 50,
        areas: ["Mirpur", "Pallabi", "Kazipara", "Shewrapara", "Kallyanpur", "Agargaon", "Shyamoli", "Gabtoli"],
    },
    {
        zoneName: "Dhanmondi Zone",
        hubName: "Dhanmondi Kitchen Hub",
        hubAddress: "FitFuel Dhanmondi Kitchen Hub, Dhanmondi 27, Dhaka",
        eta: "30-50 min",
        minutes: 50,
        areas: ["Dhanmondi", "Mohammadpur", "Lalmatia", "Kalabagan", "Farmgate", "Green Road", "Panthapath", "Tejgaon"],
    },
    {
        zoneName: "Gulshan-Badda Zone",
        hubName: "Gulshan Kitchen Hub",
        hubAddress: "FitFuel Gulshan Kitchen Hub, Gulshan 1, Dhaka",
        eta: "35-55 min",
        minutes: 55,
        areas: ["Gulshan", "Banani", "Baridhara", "Bashundhara", "Badda", "Rampura", "Aftabnagar", "Mohakhali"],
    },
    {
        zoneName: "Motijheel-Wari Zone",
        hubName: "Motijheel Kitchen Hub",
        hubAddress: "FitFuel Motijheel Kitchen Hub, Motijheel, Dhaka",
        eta: "40-60 min",
        minutes: 60,
        areas: ["Motijheel", "Paltan", "Wari", "Jatrabari", "Old Dhaka", "Malibagh", "Shantinagar", "Khilgaon"],
    },
];

// Simple text normalization lets backend match areas even if casing differs.
const normalizeArea = (area = "") => String(area).trim().toLowerCase();

const findZoneByName = (zoneName = "") =>
    DELIVERY_ZONES.find((zone) => normalizeArea(zone.zoneName) === normalizeArea(zoneName));

const findZoneByArea = (area = "") => {
    const normalizedArea = normalizeArea(area);
    return DELIVERY_ZONES.find((zone) =>
        zone.areas.some((zoneArea) => normalizeArea(zoneArea) === normalizedArea)
    );
};

// Returns the supported hub/area record for an address, or null when unavailable.
const getServiceAreaForAddress = (address = {}) => {
    const selectedZone = findZoneByName(address.deliveryZone || address.zone || "");
    const selectedArea = String(address.area || "").trim();
    const zone = selectedZone || findZoneByArea(selectedArea);

    if (!zone || !zone.areas.some((area) => normalizeArea(area) === normalizeArea(selectedArea))) {
        return null;
    }

    const areaName = zone.areas.find((area) => normalizeArea(area) === normalizeArea(selectedArea));

    return {
        ...zone,
        areaName,
    };
};

const isSupportedDhakaArea = (address = {}) => Boolean(getServiceAreaForAddress(address));

// Builds the delivery information shown to customers, riders, and admins.
const getDeliveryMeta = (order, now = new Date()) => {
    const serviceArea = getServiceAreaForAddress(order?.address || {});
    const orderDate = new Date(order?.date || now);
    const deliveryDeadline = new Date(orderDate.getTime() + COOKED_FOOD_DELIVERY_WINDOW_MINUTES * 60 * 1000);
    const pickupDeadline = new Date(orderDate.getTime() + COOKED_FOOD_PICKUP_LIMIT_MINUTES * 60 * 1000);
    const isClosed = ["Delivered", "Cancelled", "Payment Cancelled", "Refunded", "Expired", "Delivery Failed"].includes(order?.status);
    const isPickupLate =
        now > pickupDeadline &&
        Boolean(order?.assignedDeliveryPartner) &&
        ["Assigned", "Accepted", "Waiting for assignment"].includes(order?.deliveryStatus || "Waiting for assignment") &&
        !isClosed;

    return {
        estimatedDeliveryTime: serviceArea?.eta || "Up to 60 min",
        estimatedDeliveryMinutes: serviceArea?.minutes || COOKED_FOOD_DELIVERY_WINDOW_MINUTES,
        deliveryDeadline,
        pickupDeadline,
        deliveryMode: "Cooked food",
        serviceArea: serviceArea ? `${serviceArea.areaName}, ${serviceArea.zoneName}` : "Dhaka",
        kitchenHub: serviceArea?.hubName || "Nearest FitFuel Kitchen Hub",
        kitchenAddress: serviceArea?.hubAddress || order?.address?.shopAddress || "Dhaka",
        isPickupLate,
        isExpired: now > deliveryDeadline && !isClosed,
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
    const reason = "Food pickup deadline missed. Admin review required before this order continues.";

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

// If food is already in transit and the deadline passes, admin must review it.
const markDeliveryFailed = async (order, partner = null, note = "Food delivery deadline missed. Admin must refund, remake, or contact the customer.") => {
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
    COOKED_FOOD_DELIVERY_WINDOW_MINUTES,
    COOKED_FOOD_PICKUP_LIMIT_MINUTES,
    DELIVERY_ZONES,
    applyRiderWarning,
    attachDeliveryMeta,
    getDeliveryMeta,
    getServiceAreaForAddress,
    isSupportedDhakaArea,
    markDeliveryFailed,
    markExpiredOrder,
    markPickupDelayed,
};
