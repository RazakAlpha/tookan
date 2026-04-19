// src/modules/address/routes/addressRoutes.js
// Express routes for address API

const express = require("express");
const router = express.Router();
const addressController = require("../controllers/addressController");
const { validateQuery, validateBody } = require("../../middleware/validate");
const { rateLimiter } = require("../../middleware/rateLimiter");
const config = require("../../config");

// ─── GET /api/address/autocomplete ───────────────────────────────────
router.get(
  "/autocomplete",
  rateLimiter({
    windowMs: config.rateLimit.autocomplete.windowMs,
    max: config.rateLimit.autocomplete.max,
  }),
  validateQuery({
    q: { required: true, type: "string", minLength: 1, maxLength: 200 },
    maxResults: { required: false, type: "number", min: 1, max: 10 },
  }),
  addressController.autocomplete
);

// ─── GET /api/address/place/:placeId ─────────────────────────────────
router.get(
  "/place/:placeId",
  addressController.getPlaceDetails
);

// ─── POST /api/address/validate ──────────────────────────────────────
router.post(
  "/validate",
  validateBody({
    address: { required: true, type: "object" },
  }),
  addressController.validateAddress
);

// ─── POST /api/address/reverse-geocode ───────────────────────────────
router.post(
  "/reverse-geocode",
  validateBody({
    latitude: { required: true, type: "number" },
    longitude: { required: true, type: "number" },
  }),
  addressController.reverseGeocode
);

// ─── POST /api/address/service-check ─────────────────────────────────
router.post(
  "/service-check",
  validateBody({
    address: { required: true, type: "object" },
    store: { required: true, type: "object" },
  }),
  addressController.serviceAreaCheck
);

module.exports = router;
