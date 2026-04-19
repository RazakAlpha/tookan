// src/modules/address/controllers/addressController.js
// HTTP controllers for address endpoints

const { getAddressService } = require("../services/addressService");
const { success, error } = require("../../utils/response");

const addressController = {
  /**
   * GET /api/address/autocomplete?q=...&country=...&maxResults=...
   */
  async autocomplete(req, res) {
    try {
      const { q, country, maxResults, sessionToken, biasLat, biasLng } = req.query;

      const options = {};
      if (country) options.countryBias = country;
      if (maxResults) options.maxResults = parseInt(maxResults, 10);
      if (sessionToken) options.sessionToken = sessionToken;
      if (biasLat && biasLng) {
        options.locationBias = { lat: parseFloat(biasLat), lng: parseFloat(biasLng) };
      }

      const service = getAddressService();
      const suggestions = await service.autocomplete(q, options);

      res.json(success(suggestions));
    } catch (err) {
      console.error("[AddressController] autocomplete error:", err.message);
      res.status(500).json(error("Failed to fetch address suggestions", "AUTOCOMPLETE_ERROR"));
    }
  },

  /**
   * GET /api/address/place/:placeId
   */
  async getPlaceDetails(req, res) {
    try {
      const { placeId } = req.params;

      if (!placeId) {
        return res.status(400).json(error("placeId is required", "MISSING_PLACE_ID"));
      }

      const service = getAddressService();
      const details = await service.getPlaceDetails(placeId);

      // Strip raw data unless admin
      const isAdmin = req.headers["x-admin-mode"] === "true";
      if (!isAdmin && details.raw) {
        delete details.raw;
      }

      res.json(success(details));
    } catch (err) {
      console.error("[AddressController] getPlaceDetails error:", err.message);
      res.status(500).json(error("Failed to fetch place details", "PLACE_DETAILS_ERROR"));
    }
  },

  /**
   * POST /api/address/validate
   * Body: { address: NormalizedPlaceDetails }
   */
  async validateAddress(req, res) {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json(error("address object is required", "MISSING_ADDRESS"));
      }

      const service = getAddressService();
      const result = service.validateAddress(address);

      res.json(success(result));
    } catch (err) {
      console.error("[AddressController] validateAddress error:", err.message);
      res.status(500).json(error("Validation failed", "VALIDATION_ERROR"));
    }
  },

  /**
   * POST /api/address/reverse-geocode
   * Body: { latitude, longitude }
   */
  async reverseGeocode(req, res) {
    try {
      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json(error("latitude and longitude are required", "MISSING_COORDS"));
      }

      const service = getAddressService();
      const result = await service.reverseGeocode(latitude, longitude);

      res.json(success(result));
    } catch (err) {
      console.error("[AddressController] reverseGeocode error:", err.message);
      res.status(500).json(error("Reverse geocoding failed", "REVERSE_GEOCODE_ERROR"));
    }
  },

  /**
   * POST /api/address/service-check
   * Body: { address: { latitude, longitude }, store: { id, latitude, longitude, radiusKm } }
   */
  async serviceAreaCheck(req, res) {
    try {
      const { address, store } = req.body;

      if (!address) {
        return res.status(400).json(error("address is required", "MISSING_ADDRESS"));
      }
      if (!store) {
        return res.status(400).json(error("store is required", "MISSING_STORE"));
      }

      const service = getAddressService();
      const result = service.checkServiceArea(address, store);

      res.json(success(result));
    } catch (err) {
      console.error("[AddressController] serviceAreaCheck error:", err.message);
      res.status(500).json(error("Service area check failed", "SERVICE_CHECK_ERROR"));
    }
  },
};

module.exports = addressController;
