// tests/api.test.js

process.env.ADDRESS_PROVIDER = "mock";
process.env.DELIVERY_PROVIDER = "mock";
process.env.ADDRESS_SERVICE_AREA_MODE = "radius";

const request = require("supertest");
const app = require("../src/app");

describe("Address API Routes", () => {
  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.providers.address).toBe("mock");
    expect(res.body.providers.delivery).toBe("mock");
  });

  test("GET /api/address/autocomplete returns suggestions", async () => {
    const res = await request(app).get("/api/address/autocomplete?q=123 Main");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty("id");
    expect(res.body.data[0]).toHaveProperty("label");
  });

  test("GET /api/address/autocomplete fails without q param", async () => {
    const res = await request(app).get("/api/address/autocomplete");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/address/place/:placeId returns details", async () => {
    const res = await request(app).get("/api/address/place/mock_1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.addressLine1).toBe("123 Main St");
    expect(res.body.data.city).toBe("Atlanta");
    expect(res.body.data.latitude).toBe(33.749);
  });

  test("GET /api/address/place/:placeId returns raw for admin", async () => {
    const res = await request(app).get("/api/address/place/mock_1").set("x-admin-mode", "true");
    expect(res.status).toBe(200);
    expect(res.body.data.raw).toBeDefined();
  });

  test("POST /api/address/validate returns valid status", async () => {
    const res = await request(app)
      .post("/api/address/validate")
      .send({
        address: {
          addressLine1: "123 Main St",
          city: "Atlanta",
          postalCode: "30303",
          latitude: 33.749,
          longitude: -84.388,
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("valid");
  });

  test("POST /api/address/reverse-geocode returns address", async () => {
    const res = await request(app)
      .post("/api/address/reverse-geocode")
      .send({ latitude: 33.749, longitude: -84.388 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.formattedAddress).toBeTruthy();
  });

  test("POST /api/address/service-check returns result", async () => {
    const res = await request(app)
      .post("/api/address/service-check")
      .send({
        address: { latitude: 33.749, longitude: -84.388 },
        store: { id: "s1", latitude: 33.749, longitude: -84.388, radiusKm: 10 },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.allowed).toBe(true);
  });
});

describe("Delivery API Routes", () => {
  const validBody = {
    orderId: "API-TEST-001",
    customer: {
      name: "API Tester",
      phone: "+1-555-0001",
      address: "123 Main St, Atlanta, GA 30303",
      formattedAddress: "123 Main St, Atlanta, GA 30303, USA",
      addressLine1: "123 Main St",
      city: "Atlanta",
      state: "GA",
      postalCode: "30303",
      country: "US",
      latitude: 33.749,
      longitude: -84.388,
    },
    pickup: {
      name: "Downtown Store",
      address: "100 Store St, Atlanta, GA 30303",
      latitude: 33.749,
      longitude: -84.388,
    },
    store: { id: "s1", latitude: 33.749, longitude: -84.388, radiusKm: 15 },
    notes: "Test dispatch",
  };

  test("POST /api/delivery/dispatch creates task", async () => {
    const res = await request(app)
      .post("/api/delivery/dispatch")
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dispatch.taskId).toBeTruthy();
    expect(res.body.data.dispatch.status).toBe("created");
    expect(res.body.data.addressValidation.status).toBe("valid");
    expect(res.body.data.serviceAreaCheck.allowed).toBe(true);
  });

  test("POST /api/delivery/dispatch blocks invalid address", async () => {
    const res = await request(app)
      .post("/api/delivery/dispatch")
      .send({
        ...validBody,
        customer: { ...validBody.customer, addressLine1: "", latitude: null, longitude: null },
      });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("DISPATCH_BLOCKED");
  });

  test("POST /api/delivery/dispatch blocks outside service area", async () => {
    const res = await request(app)
      .post("/api/delivery/dispatch")
      .send({
        ...validBody,
        customer: { ...validBody.customer, latitude: 40.7484, longitude: -73.9857 },
      });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("DISPATCH_BLOCKED");
  });

  test("POST /api/delivery/dispatch/preview returns provider payload", async () => {
    const res = await request(app)
      .post("/api/delivery/dispatch/preview")
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.data.provider).toBe("mock");
    expect(res.body.data.payload).toBeDefined();
    expect(res.body.data.payload.order_id).toBe("API-TEST-001");
  });

  test("POST /api/delivery/dispatch fails validation for missing customer", async () => {
    const res = await request(app)
      .post("/api/delivery/dispatch")
      .send({ pickup: { address: "100 Store St" } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("GET /api/delivery/task/:taskId returns status", async () => {
    // First create a task
    const createRes = await request(app).post("/api/delivery/dispatch").send(validBody);
    const taskId = createRes.body.data.dispatch.taskId;

    const res = await request(app).get(`/api/delivery/task/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("created");
  });

  test("POST /api/delivery/task/:taskId/cancel cancels task", async () => {
    const createRes = await request(app).post("/api/delivery/dispatch").send(validBody);
    const taskId = createRes.body.data.dispatch.taskId;

    const res = await request(app).post(`/api/delivery/task/${taskId}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.data.cancelled).toBe(true);
  });

  test("POST /api/delivery/tasks/search proxies get_all_tasks", async () => {
    const res = await request(app)
      .post("/api/delivery/tasks/search")
      .send({
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        job_status: "1",
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(200);
    expect(res.body.data.data.tasks).toEqual([]);
  });

  test("POST /api/delivery/tasks/details requires jobIds", async () => {
    const res = await request(app).post("/api/delivery/tasks/details").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("POST /api/delivery/tasks/details returns jobs array", async () => {
    const res = await request(app).post("/api/delivery/tasks/details").send({ jobIds: ["5145"] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.data[0].job_id).toBe("5145");
  });

  test("404 for unknown route", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
