// src/delivery/providers/mock/MockDeliveryProvider.js
// Mock delivery provider for development and testing

const DeliveryProvider = require("../base/DeliveryProvider");

let _taskCounter = 1000;

class MockDeliveryProvider extends DeliveryProvider {
  constructor(config) {
    super(config);
    this.providerName = "mock";
    this.tasks = new Map(); // in-memory store
  }

  async createTask(payload) {
    const taskId = `MOCK-${++_taskCounter}`;
    const pickupTaskId = `MOCK-P-${_taskCounter}`;
    const deliveryTaskId = `MOCK-D-${_taskCounter}`;
    const providerPayload = this.buildProviderPayload(payload);

    const task = {
      taskId,
      pickupTaskId,
      deliveryTaskId,
      trackingUrl: `https://mock-tracking.local/track/${taskId}`,
      pickupTrackingUrl: `https://mock-tracking.local/track/${pickupTaskId}`,
      deliveryTrackingUrl: `https://mock-tracking.local/track/${deliveryTaskId}`,
      status: "created",
      createdAt: new Date().toISOString(),
      payload: providerPayload,
      raw: { provider: "mock", simulated: true },
    };

    this.tasks.set(taskId, task);
    return task;
  }

  async createPickupTask(payload) {
    const taskId = `MOCK-P-${++_taskCounter}`;
    const task = { taskId, trackingUrl: `https://mock-tracking.local/track/${taskId}`, status: "created", raw: { provider: "mock" } };
    this.tasks.set(taskId, task);
    return task;
  }

  async createDeliveryTask(payload) {
    const taskId = `MOCK-D-${++_taskCounter}`;
    const task = { taskId, trackingUrl: `https://mock-tracking.local/track/${taskId}`, status: "created", raw: { provider: "mock" } };
    this.tasks.set(taskId, task);
    return task;
  }

  async getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Mock task not found: ${taskId}`);
    return { taskId, status: task.status, statusCode: 0, details: task.payload || {}, raw: task.raw };
  }

  async cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task) task.status = "cancelled";
    return { taskId, cancelled: true, raw: { provider: "mock" } };
  }

  buildProviderPayload(payload) {
    return {
      order_id: payload.orderId || `ORD-${Date.now()}`,
      customer_name: payload.customer?.name || "Test Customer",
      customer_phone: payload.customer?.phone || "",
      customer_address: payload.customer?.formattedAddress || payload.customer?.address || "",
      latitude: payload.customer?.latitude,
      longitude: payload.customer?.longitude,
      pickup_address: payload.pickup?.address || "",
      pickup_latitude: payload.pickup?.latitude,
      pickup_longitude: payload.pickup?.longitude,
      metadata: payload.metadata || {},
    };
  }
}

module.exports = MockDeliveryProvider;
