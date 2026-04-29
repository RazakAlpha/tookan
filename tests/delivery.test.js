// tests/delivery.test.js

process.env.ADDRESS_PROVIDER = "mock";
process.env.DELIVERY_PROVIDER = "mock";
process.env.ADDRESS_SERVICE_AREA_MODE = "radius";

const { DeliveryService } = require("../src/delivery/services/deliveryService");
const TookanProvider = require("../src/delivery/providers/tookan/TookanProvider");
const { validateDispatchPayload } = require("../src/delivery/validators/dispatchValidator");

describe("DeliveryService with MockProvider", () => {
  let service;

  beforeEach(() => {
    service = new DeliveryService();
  });

  const validPayload = {
    orderId: "TEST-001",
    customer: {
      name: "Test Customer",
      phone: "+1-555-0100",
      address: "123 Main St, Atlanta, GA 30303",
      formattedAddress: "123 Main St, Atlanta, GA 30303, USA",
      addressLine1: "123 Main St",
      city: "Atlanta",
      state: "GA",
      postalCode: "30303",
      country: "US",
      latitude: 33.749,
      longitude: -84.388,
      placeId: "mock_1",
    },
    pickup: {
      name: "Atlanta Downtown Store",
      address: "100 Store St, Atlanta, GA 30303",
      latitude: 33.749,
      longitude: -84.388,
    },
    notes: "Ring doorbell",
  };

  const store = { id: "store_1", latitude: 33.749, longitude: -84.388, radiusKm: 15 };

  test("createDispatch succeeds with valid payload and address in service area", async () => {
    const result = await service.createDispatch(validPayload, { store });
    expect(result.blocked).toBe(false);
    expect(result.dispatch).toBeDefined();
    expect(result.dispatch.taskId).toBeTruthy();
    expect(result.dispatch.status).toBe("created");
    expect(result.addressValidation.status).toBe("valid");
    expect(result.serviceAreaCheck.allowed).toBe(true);
  });

  test("createDispatch blocks when address validation fails", async () => {
    const badPayload = { ...validPayload, customer: { ...validPayload.customer, addressLine1: "", latitude: null, longitude: null } };
    const result = await service.createDispatch(badPayload, { store });
    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain("validation failed");
  });

  test("createDispatch blocks when outside service area", async () => {
    const farPayload = { ...validPayload, customer: { ...validPayload.customer, latitude: 40.7484, longitude: -73.9857 } };
    const result = await service.createDispatch(farPayload, { store });
    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain("Service area");
  });

  test("createDispatch allows override when overrideServiceArea is true", async () => {
    const farPayload = { ...validPayload, customer: { ...validPayload.customer, latitude: 40.7484, longitude: -73.9857 } };
    const result = await service.createDispatch(farPayload, { store, overrideServiceArea: true });
    expect(result.blocked).toBe(false);
    expect(result.serviceAreaCheck.allowed).toBe(false); // still flagged
    expect(result.dispatch.taskId).toBeTruthy(); // but dispatched anyway
  });

  test("createDispatch skips validation when skipValidation is true", async () => {
    const result = await service.createDispatch(validPayload, { skipValidation: true, store });
    expect(result.addressValidation).toBeNull();
    expect(result.blocked).toBe(false);
  });

  test("getTaskStatus returns status for created task", async () => {
    const dispatch = await service.createDispatch(validPayload, { store });
    const status = await service.getTaskStatus(dispatch.dispatch.taskId);
    expect(status.status).toBe("created");
  });

  test("cancelTask cancels a created task", async () => {
    const dispatch = await service.createDispatch(validPayload, { store });
    const cancel = await service.cancelTask(dispatch.dispatch.taskId);
    expect(cancel.cancelled).toBe(true);
  });

  test("previewPayload returns provider-formatted payload without dispatching", () => {
    const preview = service.previewPayload(validPayload);
    expect(preview).toHaveProperty("order_id");
    expect(preview).toHaveProperty("customer_name");
    expect(preview).toHaveProperty("customer_address");
    expect(preview).toHaveProperty("latitude");
  });

  test("queryTasks delegates to mock provider", async () => {
    const out = await service.queryTasks({ start_date: "2026-01-01", end_date: "2026-01-02" });
    expect(out.status).toBe(200);
    expect(out.data.tasks).toEqual([]);
  });

  test("getJobDetails delegates to mock provider", async () => {
    const out = await service.getJobDetails(["999"]);
    expect(out.status).toBe(200);
    expect(out.data[0].job_id).toBe("999");
  });
});

describe("TookanProvider.buildProviderPayload", () => {
  let tookan;

  beforeEach(() => {
    tookan = new TookanProvider({
      tookan: {
        apiKey: "test-key",
        baseUrl: "https://api.tookanapp.com/v2",
        timezone: -300,
        autoAssignment: true,
        teamId: "team_42",
      },
    });
  });

  test("builds correct Tookan payload from normalized dispatch request", () => {
    const payload = {
      orderId: "ORD-999",
      customer: {
        name: "Jane Doe",
        phone: "+1-555-0199",
        email: "jane@example.com",
        formattedAddress: "123 Main St, Atlanta, GA 30303, USA",
        latitude: 33.749,
        longitude: -84.388,
        addressLine1: "123 Main St",
        city: "Atlanta",
        state: "GA",
        postalCode: "30303",
        country: "US",
        placeId: "place_abc1",
      },
      pickup: {
        name: "Store Downtown",
        address: "100 Store St, Atlanta, GA 30303",
        latitude: 33.749,
        longitude: -84.388,
      },
      notes: "Leave at door",
      metadata: {
        addressValidationStatus: "valid",
        serviceAreaAllowed: true,
        addressProvider: "google",
      },
    };

    const result = tookan.buildProviderPayload(payload);

    expect(result.order_id).toBe("ORD-999");
    expect(result.customer_username).toBe("Jane Doe");
    expect(result.customer_phone).toBe("+1-555-0199");
    expect(result.customer_email).toBe("jane@example.com");
    expect(result.customer_address).toBe("123 Main St, Atlanta, GA 30303, USA");
    expect(result.latitude).toBe("33.749");
    expect(result.longitude).toBe("-84.388");
    expect(result.job_pickup_name).toBe("Store Downtown");
    expect(result.job_pickup_address).toBe("100 Store St, Atlanta, GA 30303");
    expect(result.has_pickup).toBe(1);
    expect(result.has_delivery).toBe(1);
    expect(result.auto_assignment).toBe(1);
    expect(result.team_id).toBe("team_42");
    expect(result.job_description).toBe("Leave at door");
    expect(result.meta_data).toBeDefined();
    expect(result.meta_data.length).toBeGreaterThan(0);
    expect(result.meta_data.find(m => m.label === "Address Validation").data).toBe("valid");
    expect(result.meta_data.find(m => m.label === "City").data).toBe("Atlanta");
    expect(result.meta_data.find(m => m.label === "Place ID").data).toBe("place_abc1");
  });
});

describe("validateDispatchPayload", () => {
  test("passes for valid payload", () => {
    const result = validateDispatchPayload({
      customer: { name: "Test", phone: "555", address: "123 Main St", latitude: 33, longitude: -84 },
      pickup: { address: "100 Store St" },
    });
    expect(result.valid).toBe(true);
  });

  test("fails for missing customer", () => {
    const result = validateDispatchPayload({ pickup: { address: "100 Store St" } });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("customer is required");
  });

  test("fails for missing pickup", () => {
    const result = validateDispatchPayload({ customer: { name: "Test", phone: "555", address: "123 Main" } });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("pickup is required");
  });

  test("fails for invalid latitude", () => {
    const result = validateDispatchPayload({
      customer: { name: "Test", phone: "555", address: "123 Main", latitude: 999, longitude: -84 },
      pickup: { address: "100 Store" },
    });
    expect(result.valid).toBe(false);
  });

  test("fails for null body", () => {
    const result = validateDispatchPayload(null);
    expect(result.valid).toBe(false);
  });
});
