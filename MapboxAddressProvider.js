// src/modules/address/providers/mapbox/MapboxAddressProvider.js
// Mapbox Geocoding API implementation of AddressProvider

const AddressProvider = require("../base/AddressProvider");

class MapboxAddressProvider extends AddressProvider {
  constructor(config) {
    super(config);
    this.providerName = "mapbox";
    this.accessToken = config.mapbox?.accessToken;

    if (!this.accessToken) {
      console.warn("[MapboxAddressProvider] MAPBOX_ACCESS_TOKEN is not set.");
    }
  }

  async autocomplete(query, options = {}) {
    const { countryBias = "us", maxResults = 5, locationBias } = options;

    const params = new URLSearchParams({
      access_token: this.accessToken,
      autocomplete: "true",
      types: "address",
      country: countryBias,
      limit: String(maxResults),
    });

    if (locationBias?.lat && locationBias?.lng) {
      params.append("proximity", `${locationBias.lng},${locationBias.lat}`);
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features) {
      throw new Error(`Mapbox autocomplete error: ${data.message || "Unknown error"}`);
    }

    const suggestions = data.features.map((f) => ({
      id: f.id,
      label: f.place_name,
      primaryText: f.text || f.place_name.split(",")[0],
      secondaryText: f.place_name.split(",").slice(1).join(",").trim(),
    }));

    return { suggestions };
  }

  async getPlaceDetails(placeId) {
    // Mapbox doesn't have a separate place details endpoint.
    // For Mapbox, the placeId is used to re-fetch the geocoding result.
    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: "1",
    });

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeId)}.json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features?.length) {
      throw new Error("Mapbox place not found");
    }

    return this.normalizeAddress(data.features[0]);
  }

  async reverseGeocode(lat, lng) {
    const params = new URLSearchParams({
      access_token: this.accessToken,
      types: "address",
      limit: "1",
    });

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.features?.length) {
      throw new Error("Mapbox reverse geocode: no results");
    }

    return this.normalizeAddress(data.features[0]);
  }

  validateAddress(addressObj) {
    const missing = [];
    if (!addressObj) return { status: "incomplete", reason: "No address provided", fields: {} };
    if (!addressObj.addressLine1) missing.push("addressLine1");
    if (!addressObj.city) missing.push("city");

    if (!addressObj.latitude || !addressObj.longitude) {
      return { status: "missing_coordinates", reason: "Latitude and longitude are required", fields: { missing } };
    }

    if (missing.length > 0) {
      return { status: "incomplete", reason: `Missing fields: ${missing.join(", ")}`, fields: { missing } };
    }

    return { status: "valid", reason: "Address is complete and usable", fields: {} };
  }

  normalizeAddress(feature) {
    const context = feature.context || [];
    const getContext = (type) => context.find((c) => c.id?.startsWith(type));

    return {
      providerPlaceId: feature.id,
      formattedAddress: feature.place_name || "",
      addressLine1: [feature.address, feature.text].filter(Boolean).join(" "),
      addressLine2: "",
      city: getContext("place")?.text || "",
      state: getContext("region")?.short_code?.replace("US-", "") || getContext("region")?.text || "",
      postalCode: getContext("postcode")?.text || "",
      country: getContext("country")?.short_code?.toUpperCase() || "",
      latitude: feature.center?.[1] || null,
      longitude: feature.center?.[0] || null,
      raw: feature,
    };
  }
}

module.exports = MapboxAddressProvider;
