// tests/address.test.js

// Set provider to mock before loading modules
process.env.ADDRESS_PROVIDER = "mock";
process.env.ADDRESS_SERVICE_AREA_MODE = "radius";

const { AddressService } = require("../src/address/services/addressService");
const MockAddressProvider = require("../src/address/providers/mock/MockAddressProvider");

describe("MockAddressProvider", () => {
  let provider;

  beforeEach(() => {
    provider = new MockAddressProvider({});
  });

  test("autocomplete returns suggestions matching query", async () => {
    const result = await provider.autocomplete("123 Main", { maxResults: 5 });
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toHaveProperty("id");
    expect(result.suggestions[0]).toHaveProperty("label");
    expect(result.suggestions[0]).toHaveProperty("primaryText");
    expect(result.suggestions[0]).toHaveProperty("secondaryText");
  });

  test("autocomplete returns empty for non-matching query", async () => {
    const result = await provider.autocomplete("zzzznotanaddress");
    expect(result.suggestions).toHaveLength(0);
  });

  test("getPlaceDetails returns normalized address", async () => {
    const result = await provider.getPlaceDetails("mock_1");
    expect(result.providerPlaceId).toBe("mock_1");
    expect(result.formattedAddress).toContain("123 Main St");
    expect(result.addressLine1).toBe("123 Main St");
    expect(result.city).toBe("Atlanta");
    expect(result.state).toBe("GA");
    expect(result.latitude).toBe(33.749);
    expect(result.longitude).toBe(-84.388);
    expect(result.raw).toBeDefined();
  });

  test("getPlaceDetails throws for unknown placeId", async () => {
    await expect(provider.getPlaceDetails("nonexistent")).rejects.toThrow("Mock place not found");
  });

  test("reverseGeocode returns nearest address", async () => {
    const result = await provider.reverseGeocode(33.749, -84.388);
    expect(result.latitude).toBeDefined();
    expect(result.longitude).toBeDefined();
    expect(result.formattedAddress).toBeTruthy();
  });

  test("validateAddress returns valid for complete address", () => {
    const result = provider.validateAddress({
      addressLine1: "123 Main St",
      city: "Atlanta",
      postalCode: "30303",
      latitude: 33.749,
      longitude: -84.388,
    });
    expect(result.status).toBe("valid");
  });

  test("validateAddress returns incomplete for missing fields", () => {
    const result = provider.validateAddress({ addressLine1: "123 Main St" });
    expect(result.status).toBe("missing_coordinates");
  });

  test("validateAddress returns incomplete for null", () => {
    const result = provider.validateAddress(null);
    expect(result.status).toBe("incomplete");
  });
});

describe("AddressService - Service Area", () => {
  let service;

  beforeEach(() => {
    service = new AddressService();
  });

  test("checkServiceArea allows address within radius", () => {
    const address = { latitude: 33.749, longitude: -84.388 };
    const store = { id: "s1", latitude: 33.749, longitude: -84.388, radiusKm: 10 };
    const result = service.checkServiceArea(address, store);
    expect(result.allowed).toBe(true);
    expect(result.distanceFromStore).toBe(0);
  });

  test("checkServiceArea blocks address outside radius", () => {
    const address = { latitude: 40.7484, longitude: -73.9857 }; // NYC
    const store = { id: "s1", latitude: 33.749, longitude: -84.388, radiusKm: 10 }; // Atlanta
    const result = service.checkServiceArea(address, store);
    expect(result.allowed).toBe(false);
    expect(result.distanceFromStore).toBeGreaterThan(10);
  });

  test("checkServiceArea handles missing address coordinates", () => {
    const result = service.checkServiceArea({}, { id: "s1", latitude: 33.749, longitude: -84.388, radiusKm: 10 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("missing");
  });

  test("checkServiceArea handles missing store", () => {
    const result = service.checkServiceArea({ latitude: 33.749, longitude: -84.388 }, null);
    expect(result.allowed).toBe(false);
  });
});
