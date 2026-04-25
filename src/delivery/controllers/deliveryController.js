// src/delivery/controllers/deliveryController.js
// HTTP controllers for delivery dispatch endpoints

const { getDeliveryService } = require("../services/deliveryService");
const { success, error } = require("../../utils/response");

const deliveryController = {
  /**
   * POST /api/delivery/dispatch
   * Full pickup + delivery dispatch with address validation and service area check
   *
   * Body: {
   *   orderId: string,
   *   customer: { name, phone, email?, address, formattedAddress, latitude, longitude,
   *               addressLine1, addressLine2, city, state, postalCode, country, placeId },
   *   pickup:   { name, phone?, email?, address, latitude, longitude },
   *   notes:    string,
   *   scheduledAt: string (MM/DD/YYYY HH:mm),
   *   pickupAt:   string,
   *   store:    { id, latitude, longitude, radiusKm },
   *   options:  { skipValidation, skipServiceArea, overrideServiceArea }
   * }
   */
  async dispatch(req, res) {
    try {
      const { orderId, customer, pickup, notes, scheduledAt, pickupAt, store, options: opts } = req.body;

      if (!customer) {
        return res.status(400).json(error("customer object is required", "MISSING_CUSTOMER"));
      }
      if (!customer.address && !customer.formattedAddress) {
        return res.status(400).json(error("customer address is required", "MISSING_ADDRESS"));
      }
      if (!pickup) {
        return res.status(400).json(error("pickup object is required", "MISSING_PICKUP"));
      }

      const payload = { orderId, customer, pickup, notes, scheduledAt, pickupAt };
      const dispatchOptions = {
        skipValidation: opts?.skipValidation || false,
        skipServiceArea: opts?.skipServiceArea || false,
        overrideServiceArea: opts?.overrideServiceArea || false,
        store: store || null,
      };

      const service = getDeliveryService();
      const result = await service.createDispatch(payload, dispatchOptions);

      if (result.blocked) {
        return res.status(422).json({
          success: false,
          error: {
            code: "DISPATCH_BLOCKED",
            message: result.blockReason,
          },
          data: {
            addressValidation: result.addressValidation,
            serviceAreaCheck: result.serviceAreaCheck,
          },
        });
      }

      // Strip raw provider response unless admin
      const isAdmin = req.headers["x-admin-mode"] === "true";
      if (!isAdmin && result.dispatch?.raw) {
        delete result.dispatch.raw;
      }

      res.status(201).json(success(result));
    } catch (err) {
      console.error("[DeliveryController] dispatch error:", err);
      res.status(500).json(error("Dispatch failed", "DISPATCH_ERROR", err.message));
    }
  },

  /**
   * POST /api/delivery/dispatch/delivery-only
   * Delivery-only task (no pickup)
   */
  async dispatchDeliveryOnly(req, res) {
    try {
      const { orderId, customer, notes, scheduledAt, store, options: opts } = req.body;

      if (!customer) {
        return res.status(400).json(error("customer object is required", "MISSING_CUSTOMER"));
      }

      const payload = { orderId, customer, notes, scheduledAt };
      const dispatchOptions = {
        skipValidation: opts?.skipValidation || false,
        skipServiceArea: opts?.skipServiceArea || false,
        overrideServiceArea: opts?.overrideServiceArea || false,
        store: store || null,
      };

      const service = getDeliveryService();
      const result = await service.createDeliveryOnly(payload, dispatchOptions);

      if (result.blocked) {
        return res.status(422).json({
          success: false,
          error: { code: "DISPATCH_BLOCKED", message: result.blockReason },
          data: { addressValidation: result.addressValidation, serviceAreaCheck: result.serviceAreaCheck },
        });
      }

      res.status(201).json(success(result));
    } catch (err) {
      console.error("[DeliveryController] dispatchDeliveryOnly error:", err);
      res.status(500).json(error("Dispatch failed", "DISPATCH_ERROR"));
    }
  },

  /**
   * POST /api/delivery/dispatch/pickup-only
   * Pickup-only task
   */
  async dispatchPickupOnly(req, res) {
    try {
      const { orderId, pickup, notes, scheduledAt } = req.body;

      if (!pickup) {
        return res.status(400).json(error("pickup object is required", "MISSING_PICKUP"));
      }

      const payload = { orderId, pickup, notes, scheduledAt };
      const service = getDeliveryService();
      const result = await service.createPickupOnly(payload);

      if (result.blocked) {
        return res.status(422).json({
          success: false,
          error: { code: "DISPATCH_BLOCKED", message: result.blockReason },
        });
      }

      res.status(201).json(success(result));
    } catch (err) {
      console.error("[DeliveryController] dispatchPickupOnly error:", err);
      res.status(500).json(error("Dispatch failed", "DISPATCH_ERROR"));
    }
  },

  /**
   * GET /api/delivery/task/:taskId
   * Get task status
   */
  async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      if (!taskId) {
        return res.status(400).json(error("taskId is required", "MISSING_TASK_ID"));
      }

      const service = getDeliveryService();
      const result = await service.getTaskStatus(taskId);

      const isAdmin = req.headers["x-admin-mode"] === "true";
      if (!isAdmin && result.raw) delete result.raw;

      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] getTaskStatus error:", err);
      res.status(500).json(error("Failed to get task status", "TASK_STATUS_ERROR"));
    }
  },

  /**
   * POST /api/delivery/task/:taskId/cancel
   * Cancel a task
   */
  async cancelTask(req, res) {
    try {
      const { taskId } = req.params;
      if (!taskId) {
        return res.status(400).json(error("taskId is required", "MISSING_TASK_ID"));
      }

      const service = getDeliveryService();
      const result = await service.cancelTask(taskId);

      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] cancelTask error:", err);
      res.status(500).json(error("Failed to cancel task", "CANCEL_ERROR"));
    }
  },

  /**
   * POST /api/delivery/dispatch/preview
   * Preview the provider-specific payload without sending
   */
  async previewPayload(req, res) {
    try {
      const payload = req.body;
      const service = getDeliveryService();
      const providerPayload = service.previewPayload(payload);

      res.json(success({
        provider: service.provider.providerName,
        payload: providerPayload,
      }));
    } catch (err) {
      console.error("[DeliveryController] previewPayload error:", err);
      res.status(500).json(error("Preview failed", "PREVIEW_ERROR"));
    }
  },
};

module.exports = deliveryController;
