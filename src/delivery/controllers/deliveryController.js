// src/delivery/controllers/deliveryController.js
// HTTP controllers for delivery dispatch endpoints

const { getDeliveryService } = require("../services/deliveryService");
const { success, error } = require("../../utils/response");

function stripRawIfNeeded(req, obj) {
  if (!obj || typeof obj !== "object") return obj;
  const isAdmin = req.headers["x-admin-mode"] === "true";
  if (!isAdmin && Object.prototype.hasOwnProperty.call(obj, "raw")) {
    const { raw, ...rest } = obj;
    return rest;
  }
  return obj;
}

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
      const { orderId, customer, notes, scheduledAt, store, options: opts, metadata } = req.body;

      if (!customer) {
        return res.status(400).json(error("customer object is required", "MISSING_CUSTOMER"));
      }

      const payload = { orderId, customer, notes, scheduledAt, metadata };
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

      res.json(success(stripRawIfNeeded(req, result)));
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
   * POST /api/delivery/tasks/bulk — create_multiple_tasks
   */
  async createMultipleTasks(req, res) {
    try {
      const result = await getDeliveryService().createMultipleTasks(req.body || {});
      res.status(201).json(success(result));
    } catch (err) {
      console.error("[DeliveryController] createMultipleTasks error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/search — get_all_tasks
   */
  async queryTasks(req, res) {
    try {
      const result = await getDeliveryService().queryTasks(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] queryTasks error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/details — get_job_details
   * Body: { jobIds: string[]|number[], includeTaskHistory?, jobAdditionalInfo?, includeJobReport? }
   */
  async getJobDetails(req, res) {
    try {
      const { jobIds, ...opts } = req.body || {};
      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json(error("jobIds array is required", "VALIDATION_ERROR"));
      }
      const result = await getDeliveryService().getJobDetails(jobIds, opts);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] getJobDetails error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/by-order-id — get_job_details_by_order_id
   */
  async getJobDetailsByOrderId(req, res) {
    try {
      const { orderIds, ...opts } = req.body || {};
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json(error("orderIds array is required", "VALIDATION_ERROR"));
      }
      const result = await getDeliveryService().getJobDetailsByOrderId(orderIds, opts);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] getJobDetailsByOrderId error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * PATCH /api/delivery/tasks/:jobId — edit_task
   */
  async editTask(req, res) {
    try {
      const { jobId } = req.params;
      const body = { ...(req.body || {}), job_id: jobId };
      const result = await getDeliveryService().editTask(body);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] editTask error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/edit-multiple — edit_multiple_tasks
   */
  async editMultipleTasks(req, res) {
    try {
      const result = await getDeliveryService().editMultipleTasks(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] editMultipleTasks error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * DELETE /api/delivery/tasks/:jobId — delete_task
   */
  async deleteTask(req, res) {
    try {
      const { jobId } = req.params;
      const result = await getDeliveryService().deleteTask(jobId);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] deleteTask error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/:jobId/status — update_task_status
   */
  async updateTaskStatus(req, res) {
    try {
      const { jobId } = req.params;
      const jobStatus = req.body?.job_status ?? req.body?.jobStatus;
      if (jobStatus === undefined || jobStatus === null || jobStatus === "") {
        return res.status(400).json(error("job_status is required in body", "VALIDATION_ERROR"));
      }
      const result = await getDeliveryService().updateTaskStatus(jobId, jobStatus);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] updateTaskStatus error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/:jobId/assign — assign_task (merge job_id from URL)
   */
  async assignTask(req, res) {
    try {
      const { jobId } = req.params;
      const body = { ...(req.body || {}), job_id: jobId };
      const result = await getDeliveryService().assignTask(body);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] assignTask error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/:jobId/auto-assign — re_autoassign_task
   */
  async reAutoassignTask(req, res) {
    try {
      const { jobId } = req.params;
      const result = await getDeliveryService().reAutoassignTask(jobId);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] reAutoassignTask error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/reassign-open
   * POST /api/delivery/agents/reassign-open-tasks
   * Tookan: reassign_open_tasks — body: user_id, team_id, fleet_id, job_ids[] (api_key from env)
   */
  async reassignOpenTasks(req, res) {
    try {
      const result = await getDeliveryService().reassignOpenTasks(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] reassignOpenTasks error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/assign-fleet — assign_fleet_to_task
   */
  async assignFleetToTask(req, res) {
    try {
      const result = await getDeliveryService().assignFleetToTask(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] assignFleetToTask error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/tasks/assign-fleet-related — assign_fleet_to_related_tasks
   */
  async assignFleetToRelatedTasks(req, res) {
    try {
      const result = await getDeliveryService().assignFleetToRelatedTasks(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] assignFleetToRelatedTasks error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/agents — add_agent
   */
  async addAgent(req, res) {
    try {
      const result = await getDeliveryService().addAgent(req.body || {});
      res.status(201).json(success(result));
    } catch (err) {
      console.error("[DeliveryController] addAgent error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/agents/search — get_all_fleets
   */
  async queryFleets(req, res) {
    try {
      const result = await getDeliveryService().queryFleets(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] queryFleets error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * PATCH /api/delivery/agents/:fleetId — edit_agent
   */
  async editAgent(req, res) {
    try {
      const { fleetId } = req.params;
      const body = { ...(req.body || {}), fleet_id: fleetId };
      const result = await getDeliveryService().editAgent(body);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] editAgent error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * DELETE /api/delivery/agents/:fleetId — delete_fleet_account
   */
  async deleteFleetAccount(req, res) {
    try {
      const { fleetId } = req.params;
      const result = await getDeliveryService().deleteFleetAccount(fleetId);
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] deleteFleetAccount error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/agents/block-status — block_and_unblock_agent
   */
  async blockAndUnblockAgent(req, res) {
    try {
      const result = await getDeliveryService().blockAndUnblockAgent(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] blockAndUnblockAgent error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/teams — create_team
   */
  async createTeam(req, res) {
    try {
      const result = await getDeliveryService().createTeam(req.body || {});
      res.status(201).json(success(result));
    } catch (err) {
      console.error("[DeliveryController] createTeam error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
    }
  },

  /**
   * POST /api/delivery/teams/list — view_all_team_only
   */
  async listTeams(req, res) {
    try {
      const result = await getDeliveryService().listTeams(req.body || {});
      res.json(success(result));
    } catch (err) {
      console.error("[DeliveryController] listTeams error:", err);
      res.status(500).json(error(err.message || "Provider error", "DELIVERY_PROVIDER_ERROR"));
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
