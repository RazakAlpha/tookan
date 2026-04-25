// src/address/providers/google/GoogleAddressProvider.js
// Google Places API implementation of AddressProvider

const AddressProvider = require("../base/AddressProvider");

class GoogleAddressProvider extends AddressProvider {
  constructor(config) {
    super(config);
    this.providerName = "google";
    this.placesApiKey = config.google?.placesApiKey;
    this.mapsApiKey = config.google?.mapsApiKey;

    if (!this.placesApiKey) {
      console.warn("[GoogleAddressProvider] GOOGLE_PLACES_API_KEY is not set.");
    }
  }

  async autocomplete(query, options = {}) {
    const { countryBias = "us", maxResults = 5, sessionToken } = options;

    const params = new URLSearchParams({
      input: query,
      key: this.placesApiKey,
      types: "address",
      components: `country:${countryBias}`,
    });
    if (sessionToken) params.append("sessiontoken", sessionToken);

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google autocomplete error: ${data.status} — ${data.error_message || ""}`);
    }

    const suggestions = (data.predictions || []).slice(0, maxResults).map((p) => ({
      id: p.place_id,
      label: p.description,
      primaryText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || "",
    }));

    return { suggestions };
  }

  async getPlaceDetails(placeId) {
    const params = new URLSearchParams({
      place_id: placeId,
      key: this.placesApiKey,
      fields: "formatted_address,geometry,address_components,place_id,name",
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error(`Google place details error: ${data.status}`);
    }

    return this.normalizeAddress(data.result);
  }

  async reverseGeocode(lat, lng) {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.mapsApiKey || this.placesApiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      throw new Error(`Google reverse geocode error: ${data.status}`);
    }

    return this.normalizeAddress(data.results[0]);
  }

  validateAddress(addressObj) {
    const missing = [];
    if (!addressObj) return { status: "incomplete", reason: "No address provided", fields: {} };
    if (!addressObj.addressLine1) missing.push("addressLine1");
    if (!addressObj.city) missing.push("city");
    if (!addressObj.state) missing.push("state");
    if (!addressObj.postalCode) missing.push("postalCode");

    if (!addressObj.latitude || !addressObj.longitude) {
      return { status: "missing_coordinates", reason: "Latitude and longitude are required", fields: { missing } };
    }

    if (missing.length > 0) {
      return { status: "incomplete", reason: `Missing fields: ${missing.join(", ")}`, fields: { missing } };
    }

    return { status: "valid", reason: "Address is complete and usable", fields: {} };
  }

  normalizeAddress(result) {
    const components = result.address_components || [];
    const get = (type) => components.find((c) => c.types.includes(type));

    const streetNumber = get("street_number")?.long_name || "";
    const route = get("route")?.long_name || "";
    const subpremise = get("subpremise")?.long_name || "";

    return {
      providerPlaceId: result.place_id,
      formattedAddress: result.formatted_address || "",
      addressLine1: [streetNumber, route].filter(Boolean).join(" "),
      addressLine2: subpremise,
      city:
        get("locality")?.long_name ||
        get("sublocality_level_1")?.long_name ||
        get("administrative_area_level_2")?.long_name ||
        "",
      state: get("administrative_area_level_1")?.short_name || "",
      postalCode: get("postal_code")?.long_name || "",
      country: get("country")?.short_name || "",
      latitude: result.geometry?.location?.lat || null,
      longitude: result.geometry?.location?.lng || null,
      raw: result,
    };
  }
}

module.exports = GoogleAddressProvider;
