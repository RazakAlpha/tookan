// src/delivery/validators/dispatchValidator.js
// Validation schemas for dispatch request payloads

/**
 * Validate a full dispatch request body
 * Returns { valid: boolean, errors: string[] }
 */
function validateDispatchPayload(body) {
  const errors = [];

  if (!body) {
    return { valid: false, errors: ["Request body is required"] };
  }

  // Customer validation
  if (!body.customer) {
    errors.push("customer is required");
  } else {
    if (!body.customer.name) errors.push("customer.name is required");
    if (!body.customer.phone) errors.push("customer.phone is required");
    if (!body.customer.address && !body.customer.formattedAddress) {
      errors.push("customer.address or customer.formattedAddress is required");
    }
    if (body.customer.latitude !== undefined && body.customer.latitude !== null) {
      if (typeof body.customer.latitude !== "number" || body.customer.latitude < -90 || body.customer.latitude > 90) {
        errors.push("customer.latitude must be a valid latitude (-90 to 90)");
      }
    }
    if (body.customer.longitude !== undefined && body.customer.longitude !== null) {
      if (typeof body.customer.longitude !== "number" || body.customer.longitude < -180 || body.customer.longitude > 180) {
        errors.push("customer.longitude must be a valid longitude (-180 to 180)");
      }
    }
  }

  // Pickup validation
  if (!body.pickup) {
    errors.push("pickup is required");
  } else {
    if (!body.pickup.address) errors.push("pickup.address is required");
  }

  // Store validation (optional but if present must have coords)
  if (body.store) {
    if (body.store.latitude === undefined) errors.push("store.latitude is required when store is provided");
    if (body.store.longitude === undefined) errors.push("store.longitude is required when store is provided");
  }

  // Schedule validation
  if (body.scheduledAt && !isValidDateFormat(body.scheduledAt)) {
    errors.push("scheduledAt must be in MM/DD/YYYY HH:mm format or ISO 8601");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate delivery-only request
 */
function validateDeliveryOnlyPayload(body) {
  const errors = [];
  if (!body?.customer) errors.push("customer is required");
  else {
    if (!body.customer.address && !body.customer.formattedAddress) errors.push("customer address is required");
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate pickup-only request
 */
function validatePickupOnlyPayload(body) {
  const errors = [];
  if (!body?.pickup) errors.push("pickup is required");
  else {
    if (!body.pickup.address) errors.push("pickup.address is required");
  }
  return { valid: errors.length === 0, errors };
}

function isValidDateFormat(str) {
  // Accept MM/DD/YYYY HH:mm or ISO 8601
  return /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/.test(str) || !isNaN(Date.parse(str));
}

module.exports = { validateDispatchPayload, validateDeliveryOnlyPayload, validatePickupOnlyPayload };
