// src/delivery/providers/base/DeliveryProvider.js
// Abstract base class for delivery dispatch providers (Tookan, etc.)

class DeliveryProvider {
  constructor(config = {}) {
    if (new.target === DeliveryProvider) {
      throw new Error("DeliveryProvider is abstract and cannot be instantiated directly.");
    }
    this.config = config;
    this.providerName = "base";
  }

  /**
   * Create a pickup and delivery task
   * @param {object} payload - Normalized dispatch payload
   * @returns {Promise<{ taskId: string, trackingUrl: string, status: string, raw: object }>}
   */
  async createTask(payload) {
    throw new Error("createTask() must be implemented by provider");
  }

  /**
   * Create a pickup-only task
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async createPickupTask(payload) {
    throw new Error("createPickupTask() must be implemented by provider");
  }

  /**
   * Create a delivery-only task
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async createDeliveryTask(payload) {
    throw new Error("createDeliveryTask() must be implemented by provider");
  }

  /**
   * Get task status by task ID
   * @param {string} taskId
   * @returns {Promise<{ taskId, status, details, raw }>}
   */
  async getTaskStatus(taskId) {
    throw new Error("getTaskStatus() must be implemented by provider");
  }

  /**
   * Cancel a task
   * @param {string} taskId
   * @returns {Promise<{ taskId, cancelled: boolean, raw }>}
   */
  async cancelTask(taskId) {
    throw new Error("cancelTask() must be implemented by provider");
  }

  /**
   * Build the provider-specific payload from the normalized dispatch request
   * @param {object} normalizedPayload
   * @returns {object} provider-formatted payload
   */
  buildProviderPayload(normalizedPayload) {
    throw new Error("buildProviderPayload() must be implemented by provider");
  }

  // ─── Extended Tookan-style operations (slug-aligned with tookan_api_guide.md) ───

  async createMultipleTasks(body) {
    throw new Error("createMultipleTasks() must be implemented by provider");
  }

  async getAllTasks(filters) {
    throw new Error("getAllTasks() must be implemented by provider");
  }

  async getJobDetails(jobIds, options) {
    throw new Error("getJobDetails() must be implemented by provider");
  }

  async getJobDetailsByOrderId(orderIds, options) {
    throw new Error("getJobDetailsByOrderId() must be implemented by provider");
  }

  async editTask(body) {
    throw new Error("editTask() must be implemented by provider");
  }

  async editMultipleTasks(body) {
    throw new Error("editMultipleTasks() must be implemented by provider");
  }

  async deleteTask(jobId) {
    throw new Error("deleteTask() must be implemented by provider");
  }

  async updateTaskStatus(jobId, jobStatus) {
    throw new Error("updateTaskStatus() must be implemented by provider");
  }

  async assignTask(body) {
    throw new Error("assignTask() must be implemented by provider");
  }

  async reassignOpenTasks(body) {
    throw new Error("reassignOpenTasks() must be implemented by provider");
  }

  async reAutoassignTask(jobId) {
    throw new Error("reAutoassignTask() must be implemented by provider");
  }

  async assignFleetToTask(body) {
    throw new Error("assignFleetToTask() must be implemented by provider");
  }

  async assignFleetToRelatedTasks(body) {
    throw new Error("assignFleetToRelatedTasks() must be implemented by provider");
  }

  async addAgent(body) {
    throw new Error("addAgent() must be implemented by provider");
  }

  async getAllFleets(filters) {
    throw new Error("getAllFleets() must be implemented by provider");
  }

  async editAgent(body) {
    throw new Error("editAgent() must be implemented by provider");
  }

  async deleteFleetAccount(fleetId) {
    throw new Error("deleteFleetAccount() must be implemented by provider");
  }

  async blockAndUnblockAgent(body) {
    throw new Error("blockAndUnblockAgent() must be implemented by provider");
  }

  async createTeam(body) {
    throw new Error("createTeam() must be implemented by provider");
  }

  async viewAllTeams(body) {
    throw new Error("viewAllTeams() must be implemented by provider");
  }
}

module.exports = DeliveryProvider;
