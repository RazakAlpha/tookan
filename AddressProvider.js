// src/modules/address/providers/base/AddressProvider.js
// Abstract base class defining the address provider contract.
// All providers (Google, Mapbox, Mock) must implement these methods.

class AddressProvider {
  constructor(config = {}) {
    if (new.target === AddressProvider) {
      throw new Error("AddressProvider is abstract and cannot be instantiated directly.");
    }
    this.config = config;
    this.providerName = "base";
  }

  /**
   * Search for address suggestions based on a text query
   * @param {string} query - The search text
   * @param {object} options - { countryBias, locationBias: {lat, lng}, maxResults, sessionToken }
   * @returns {Promise<{ suggestions: Array<NormalizedSuggestion> }>}
   *
   * NormalizedSuggestion: {
   *   id: string,           // provider-specific place ID
   *   label: string,        // full display string
   *   primaryText: string,  // main part (e.g. street address)
   *   secondaryText: string // secondary part (e.g. city, state)
   * }
   */
  async autocomplete(query, options = {}) {
    throw new Error("autocomplete() must be implemented by provider");
  }

  /**
   * Fetch full details for a place by its provider ID
   * @param {string} placeId
   * @returns {Promise<NormalizedPlaceDetails>}
   *
   * NormalizedPlaceDetails: {
   *   providerPlaceId: string,
   *   formattedAddress: string,
   *   addressLine1: string,
   *   addressLine2: string,
   *   city: string,
   *   state: string,
   *   postalCode: string,
   *   country: string,
   *   latitude: number,
   *   longitude: number,
   *   raw: object  // original provider response
   * }
   */
  async getPlaceDetails(placeId) {
    throw new Error("getPlaceDetails() must be implemented by provider");
  }

  /**
   * Reverse geocode coordinates to an address
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<NormalizedPlaceDetails>}
   */
  async reverseGeocode(lat, lng) {
    throw new Error("reverseGeocode() must be implemented by provider");
  }

  /**
   * Validate an address object for delivery use
   * @param {NormalizedPlaceDetails} addressObj
   * @returns {{ status: string, reason: string, fields: object }}
   *
   * status values: 'valid' | 'incomplete' | 'missing_coordinates' | 'ambiguous' | 'invalid'
   */
  validateAddress(addressObj) {
    throw new Error("validateAddress() must be implemented by provider");
  }

  /**
   * Normalize a raw provider response into the standard format
   * @param {object} providerPayload - Raw response from the provider
   * @returns {NormalizedPlaceDetails}
   */
  normalizeAddress(providerPayload) {
    throw new Error("normalizeAddress() must be implemented by provider");
  }
}

module.exports = AddressProvider;
