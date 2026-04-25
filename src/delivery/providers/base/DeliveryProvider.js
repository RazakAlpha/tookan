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
}

module.exports = DeliveryProvider;
