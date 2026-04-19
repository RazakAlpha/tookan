// src/modules/address/services/addressService.js
// Business logic for address operations

const { getAddressProvider } = require("../providers");
const { haversineDistance, isPointInPolygon } = require("../../utils/geo");
const config = require("../../config");

class AddressService {
  constructor() {
    this.provider = getAddressProvider();
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(query, options = {}) {
    const opts = {
      countryBias: options.countryBias || config.address.autocomplete.countryBias,
      maxResults: options.maxResults || config.address.autocomplete.maxResults,
      sessionToken: options.sessionToken || null,
      locationBias: options.locationBias || null,
    };

    const result = await this.provider.autocomplete(query, opts);
    return result.suggestions;
  }

  /**
   * Get full place details by provider place ID
   */
  async getPlaceDetails(placeId) {
    return this.provider.getPlaceDetails(placeId);
  }

  /**
   * Reverse geocode lat/lng to address
   */
  async reverseGeocode(lat, lng) {
    return this.provider.reverseGeocode(lat, lng);
  }

  /**
   * Validate an address for delivery usability
   */
  validateAddress(addressObj) {
    return this.provider.validateAddress(addressObj);
  }

  /**
   * Check if an address is within a store's service area
   * @param {object} address - { latitude, longitude }
   * @param {object} store - { latitude, longitude, radiusKm, polygon? }
   * @returns {object} { allowed, reason, distanceFromStore, configuredLimit, storeId }
   */
  checkServiceArea(address, store) {
    const mode = config.address.serviceArea.mode;

    if (mode === "disabled") {
      return {
        allowed: true,
        reason: "Service area checking is disabled",
        distanceFromStore: null,
        configuredLimit: null,
        storeId: store?.id || null,
      };
    }

    if (!address?.latitude || !address?.longitude) {
      return {
        allowed: false,
        reason: "Address coordinates are missing",
        distanceFromStore: null,
        configuredLimit: null,
        storeId: store?.id || null,
      };
    }

    if (!store?.latitude || !store?.longitude) {
      return {
        allowed: false,
        reason: "Store coordinates are missing",
        distanceFromStore: null,
        configuredLimit: null,
        storeId: store?.id || null,
      };
    }

    // Radius mode
    if (mode === "radius") {
      const distance = haversineDistance(
        store.latitude,
        store.longitude,
        address.latitude,
        address.longitude
      );
      const limit = store.radiusKm || 10;
      const allowed = distance <= limit;

      return {
        allowed,
        reason: allowed
          ? `Within service area (${distance.toFixed(2)} km)`
          : `Outside service area: ${distance.toFixed(2)} km away, limit is ${limit} km`,
        distanceFromStore: parseFloat(distance.toFixed(2)),
        configuredLimit: limit,
        storeId: store.id || null,
      };
    }

    // Polygon mode
    if (mode === "polygon" && store.polygon?.length >= 3) {
      const inside = isPointInPolygon(address.latitude, address.longitude, store.polygon);
      const distance = haversineDistance(
        store.latitude,
        store.longitude,
        address.latitude,
        address.longitude
      );

      return {
        allowed: inside,
        reason: inside ? "Within service area polygon" : "Outside service area polygon",
        distanceFromStore: parseFloat(distance.toFixed(2)),
        configuredLimit: null,
        storeId: store.id || null,
      };
    }

    return {
      allowed: true,
      reason: "No service area configured",
      distanceFromStore: null,
      configuredLimit: null,
      storeId: store?.id || null,
    };
  }
}

// Singleton
let _service = null;
function getAddressService() {
  if (!_service) _service = new AddressService();
  return _service;
}

module.exports = { AddressService, getAddressService };
