// src/address/providers/mock/MockAddressProvider.js
// Mock provider for local development and testing

const AddressProvider = require("../base/AddressProvider");

const MOCK_DB = [
  { id: "mock_1", address: "123 Main St", city: "Atlanta", state: "GA", zip: "30303", lat: 33.749, lng: -84.388 },
  { id: "mock_2", address: "123 Peachtree St NE", city: "Atlanta", state: "GA", zip: "30303", lat: 33.759, lng: -84.386 },
  { id: "mock_3", address: "1234 Piedmont Ave NE", city: "Atlanta", state: "GA", zip: "30309", lat: 33.784, lng: -84.372 },
  { id: "mock_4", address: "456 Oak Dr", city: "Decatur", state: "GA", zip: "30030", lat: 33.774, lng: -84.296 },
  { id: "mock_5", address: "4567 Roswell Rd", city: "Sandy Springs", state: "GA", zip: "30342", lat: 33.936, lng: -84.362 },
  { id: "mock_6", address: "789 Ponce de Leon Ave", city: "Atlanta", state: "GA", zip: "30306", lat: 33.774, lng: -84.365 },
  { id: "mock_7", address: "10 Downing St", city: "London", state: "", zip: "SW1A 2AA", lat: 51.5034, lng: -0.1276, country: "UK" },
  { id: "mock_8", address: "1600 Pennsylvania Ave NW", city: "Washington", state: "DC", zip: "20500", lat: 38.8977, lng: -77.0365 },
  { id: "mock_9", address: "350 Fifth Ave", city: "New York", state: "NY", zip: "10118", lat: 40.7484, lng: -73.9857 },
  { id: "mock_10", address: "233 S Wacker Dr", city: "Chicago", state: "IL", zip: "60606", lat: 41.8789, lng: -87.6359 },
];

class MockAddressProvider extends AddressProvider {
  constructor(config) {
    super(config);
    this.providerName = "mock";
    this.delay = 150; // simulate network latency
  }

  async _simulate() {
    return new Promise((r) => setTimeout(r, this.delay + Math.random() * 100));
  }

  async autocomplete(query, options = {}) {
    await this._simulate();
    const { maxResults = 5 } = options;
    const q = query.toLowerCase();

    const matches = MOCK_DB
      .filter(
        (m) =>
          m.address.toLowerCase().includes(q) ||
          m.city.toLowerCase().includes(q) ||
          m.zip.includes(q)
      )
      .slice(0, maxResults);

    return {
      suggestions: matches.map((m) => ({
        id: m.id,
        label: `${m.address}, ${m.city}, ${m.state} ${m.zip}, ${m.country || "USA"}`,
        primaryText: m.address,
        secondaryText: `${m.city}, ${m.state} ${m.zip}`,
      })),
    };
  }

  async getPlaceDetails(placeId) {
    await this._simulate();
    const place = MOCK_DB.find((m) => m.id === placeId);
    if (!place) throw new Error(`Mock place not found: ${placeId}`);
    return this.normalizeAddress(place);
  }

  async reverseGeocode(lat, lng) {
    await this._simulate();
    // Find nearest mock address
    let nearest = MOCK_DB[0];
    let minDist = Infinity;
    for (const m of MOCK_DB) {
      const d = Math.sqrt((m.lat - lat) ** 2 + (m.lng - lng) ** 2);
      if (d < minDist) { minDist = d; nearest = m; }
    }
    return this.normalizeAddress(nearest);
  }

  validateAddress(addressObj) {
    if (!addressObj) return { status: "incomplete", reason: "No address provided", fields: {} };
    const missing = [];
    if (!addressObj.addressLine1) missing.push("addressLine1");
    if (!addressObj.city) missing.push("city");
    if (!addressObj.postalCode) missing.push("postalCode");
    if (!addressObj.latitude || !addressObj.longitude)
      return { status: "missing_coordinates", reason: "Missing lat/lng", fields: { missing } };
    if (missing.length > 0)
      return { status: "incomplete", reason: `Missing: ${missing.join(", ")}`, fields: { missing } };
    return { status: "valid", reason: "Address is complete and usable", fields: {} };
  }

  normalizeAddress(place) {
    return {
      providerPlaceId: place.id,
      formattedAddress: `${place.address}, ${place.city}, ${place.state} ${place.zip}, ${place.country || "USA"}`,
      addressLine1: place.address,
      addressLine2: "",
      city: place.city,
      state: place.state,
      postalCode: place.zip,
      country: place.country || "US",
      latitude: place.lat,
      longitude: place.lng,
      raw: { ...place, provider: "mock", fetchedAt: new Date().toISOString() },
    };
  }
}

module.exports = MockAddressProvider;
