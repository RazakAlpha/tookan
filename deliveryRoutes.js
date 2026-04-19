// src/modules/delivery/routes/deliveryRoutes.js
// Express routes for delivery dispatch API

const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/deliveryController");
const { rateLimiter } = require("../../middleware/rateLimiter");
const { validateDispatchPayload, validateDeliveryOnlyPayload, validatePickupOnlyPayload } = require("../validators/dispatchValidator");
const { error } = require("../../utils/response");
const config = require("../../config");

// Rate limiter for dispatch endpoints
const dispatchLimiter = rateLimiter({
  windowMs: config.rateLimit.dispatch.windowMs,
  max: config.rateLimit.dispatch.max,
});

// Validation middleware factory
function validateWith(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.valid) {
      return res.status(400).json(
        error("Invalid dispatch payload", "VALIDATION_ERROR", result.errors)
      );
    }
    next();
  };
}

// ─── POST /api/delivery/dispatch ─────────────────────────────────────
// Full pickup + delivery dispatch
router.post(
  "/dispatch",
  dispatchLimiter,
  validateWith(validateDispatchPayload),
  deliveryController.dispatch
);

// ─── POST /api/delivery/dispatch/delivery-only ───────────────────────
router.post(
  "/dispatch/delivery-only",
  dispatchLimiter,
  validateWith(validateDeliveryOnlyPayload),
  deliveryController.dispatchDeliveryOnly
);

// ─── POST /api/delivery/dispatch/pickup-only ─────────────────────────
router.post(
  "/dispatch/pickup-only",
  dispatchLimiter,
  validateWith(validatePickupOnlyPayload),
  deliveryController.dispatchPickupOnly
);

// ─── POST /api/delivery/dispatch/preview ─────────────────────────────
// Preview the Tookan payload without actually dispatching
router.post(
  "/dispatch/preview",
  deliveryController.previewPayload
);

// ─── GET /api/delivery/task/:taskId ──────────────────────────────────
// Get task status
router.get(
  "/task/:taskId",
  deliveryController.getTaskStatus
);

// ─── POST /api/delivery/task/:taskId/cancel ──────────────────────────
// Cancel a task
router.post(
  "/task/:taskId/cancel",
  dispatchLimiter,
  deliveryController.cancelTask
);

module.exports = router;
