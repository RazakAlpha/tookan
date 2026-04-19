// src/modules/delivery/services/deliveryService.js
// Business logic for delivery dispatch operations

const { getDeliveryProvider } = require("../providers");
const { getAddressService } = require("../../address/services/addressService");

class DeliveryService {
  constructor() {
    this.provider = getDeliveryProvider();
    this.addressService = getAddressService();
  }

  /**
   * Create a full pickup-and-delivery task with address validation
   * @param {object} payload - Normalized dispatch payload
   * @param {object} options - { skipValidation, skipServiceArea, overrideServiceArea, store }
   */
  async createDispatch(payload, options = {}) {
    const {
      skipValidation = false,
      skipServiceArea = false,
      overrideServiceArea = false,
      store = null,
    } = options;

    const result = {
      addressValidation: null,
      serviceAreaCheck: null,
      dispatch: null,
      blocked: false,
      blockReason: null,
    };

    // ── Step 1: Validate the delivery address ──
    if (!skipValidation) {
      const addressObj = {
        addressLine1: payload.customer?.addressLine1,
        addressLine2: payload.customer?.addressLine2,
        city: payload.customer?.city,
        state: payload.customer?.state,
        postalCode: payload.customer?.postalCode,
        country: payload.customer?.country,
        latitude: payload.customer?.latitude,
        longitude: payload.customer?.longitude,
      };

      result.addressValidation = this.addressService.validateAddress(addressObj);

      if (result.addressValidation.status !== "valid") {
        result.blocked = true;
        result.blockReason = `Address validation failed: ${result.addressValidation.reason}`;
        return result;
      }
    }

    // ── Step 2: Check service area ──
    if (!skipServiceArea && store) {
      const addressCoords = {
        latitude: payload.customer?.latitude,
        longitude: payload.customer?.longitude,
      };

      result.serviceAreaCheck = this.addressService.checkServiceArea(addressCoords, store);

      if (!result.serviceAreaCheck.allowed && !overrideServiceArea) {
        result.blocked = true;
        result.blockReason = `Service area check failed: ${result.serviceAreaCheck.reason}`;
        return result;
      }
    }

    // ── Step 3: Enrich metadata ──
    if (!payload.metadata) payload.metadata = {};
    payload.metadata.addressValidationStatus = result.addressValidation?.status || "skipped";
    payload.metadata.serviceAreaAllowed = result.serviceAreaCheck?.allowed ?? null;
    payload.metadata.addressProvider = this.addressService.provider.providerName;
    payload.metadata.dispatchedAt = new Date().toISOString();

    // ── Step 4: Dispatch to delivery provider ──
    try {
      result.dispatch = await this.provider.createTask(payload);
    } catch (err) {
      result.blocked = true;
      result.blockReason = `Delivery provider error: ${err.message}`;
      result.dispatch = { error: err.message, raw: err.tookanResponse || null };
    }

    return result;
  }

  /**
   * Create a delivery-only task (no pickup)
   */
  async createDeliveryOnly(payload, options = {}) {
    // Same validation flow, then delivery-only
    const preCheck = await this._preCheck(payload, options);
    if (preCheck.blocked) return preCheck;

    try {
      preCheck.dispatch = await this.provider.createDeliveryTask(payload);
    } catch (err) {
      preCheck.blocked = true;
      preCheck.blockReason = `Delivery provider error: ${err.message}`;
    }

    return preCheck;
  }

  /**
   * Create a pickup-only task
   */
  async createPickupOnly(payload) {
    try {
      const dispatch = await this.provider.createPickupTask(payload);
      return { blocked: false, dispatch };
    } catch (err) {
      return { blocked: true, blockReason: err.message, dispatch: null };
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId) {
    return this.provider.getTaskStatus(taskId);
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId) {
    return this.provider.cancelTask(taskId);
  }

  /**
   * Preview the provider-specific payload without dispatching
   */
  previewPayload(payload) {
    return this.provider.buildProviderPayload(payload);
  }

  /**
   * Internal: run address validation + service area checks
   */
  async _preCheck(payload, options = {}) {
    const result = { addressValidation: null, serviceAreaCheck: null, dispatch: null, blocked: false, blockReason: null };

    if (!options.skipValidation) {
      result.addressValidation = this.addressService.validateAddress({
        addressLine1: payload.customer?.addressLine1,
        city: payload.customer?.city,
        postalCode: payload.customer?.postalCode,
        latitude: payload.customer?.latitude,
        longitude: payload.customer?.longitude,
      });
      if (result.addressValidation.status !== "valid") {
        result.blocked = true;
        result.blockReason = `Validation: ${result.addressValidation.reason}`;
        return result;
      }
    }

    if (!options.skipServiceArea && options.store) {
      result.serviceAreaCheck = this.addressService.checkServiceArea(
        { latitude: payload.customer?.latitude, longitude: payload.customer?.longitude },
        options.store
      );
      if (!result.serviceAreaCheck.allowed && !options.overrideServiceArea) {
        result.blocked = true;
        result.blockReason = `Service area: ${result.serviceAreaCheck.reason}`;
        return result;
      }
    }

    return result;
  }
}

// Singleton
let _service = null;
function getDeliveryService() {
  if (!_service) _service = new DeliveryService();
  return _service;
}

module.exports = { DeliveryService, getDeliveryService };
