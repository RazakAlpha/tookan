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

  _mockOk(data = {}) {
    return { status: 200, message: "Successful", data, simulated: true };
  }

  async createMultipleTasks(body) {
    return this._mockOk({
      pickup_job_id: "MOCK-P-BULK",
      delivery_job_id: "MOCK-D-BULK",
      job_id: "MOCK-BULK-1",
      ...body,
    });
  }

  async getAllTasks(filters = {}) {
    return this._mockOk({
      tasks: [],
      requested_page: filters.requested_page || 1,
      total_page_count: 0,
    });
  }

  async getJobDetails(jobIds, options = {}) {
    const ids = Array.isArray(jobIds) ? jobIds : [jobIds];
    return this._mockOk(
      ids.map((id) => ({
        job_id: id,
        job_status: 0,
        fleet_name: "Mock Agent",
        fleet_phone: "+15550100",
        tracking_link: `https://mock-tracking.local/track/${id}`,
        customer_username: "Mock Customer",
        job_description: "mock task",
      }))
    );
  }

  async getJobDetailsByOrderId(orderIds, options = {}) {
    const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
    return this._mockOk(
      ids.map((order_id, i) => ({
        job_id: `MOCK-J-${i}`,
        order_id,
        job_status: 0,
      }))
    );
  }

  async editTask(body) {
    return this._mockOk({ job_id: body.job_id, updated: true });
  }

  async editMultipleTasks(body) {
    return this._mockOk({ updated: true, pickups: body.pickups?.length ?? 0, deliveries: body.deliveries?.length ?? 0 });
  }

  async deleteTask(jobId) {
    return this._mockOk({ job_id: jobId, deleted: true });
  }

  async updateTaskStatus(jobId, jobStatus) {
    return this._mockOk({ job_id: jobId, job_status: jobStatus });
  }

  async assignTask(body) {
    return this._mockOk({ assigned: true, ...body });
  }

  async reassignOpenTasks(body) {
    return this._mockOk({ reassigned: true, job_ids: body.job_ids });
  }

  async reAutoassignTask(jobId) {
    return this._mockOk({ job_id: jobId, reassigned: true });
  }

  async assignFleetToTask(body) {
    return this._mockOk({ assigned: true, ...body });
  }

  async assignFleetToRelatedTasks(body) {
    return this._mockOk({ assigned: true, ...body });
  }

  async addAgent(body) {
    return this._mockOk({ fleet_id: "MOCK-FLEET-1", ...body });
  }

  async getAllFleets(filters = {}) {
    return this._mockOk([
      { fleet_id: 1, username: "mock_agent", status: 0 },
    ]);
  }

  async editAgent(body) {
    return this._mockOk({ fleet_id: body.fleet_id, updated: true });
  }

  async deleteFleetAccount(fleetId) {
    return this._mockOk({ fleet_id: fleetId, deleted: true });
  }

  async blockAndUnblockAgent(body) {
    return this._mockOk({ ok: true, ...body });
  }

  async createTeam(body) {
    return this._mockOk({ team_id: "MOCK-TEAM-1", ...body });
  }

  async viewAllTeams(body = {}) {
    return this._mockOk([{ team_id: 1, team_name: "Mock Team" }]);
  }
}

module.exports = MockDeliveryProvider;
