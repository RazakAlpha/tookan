// src/delivery/providers/tookan/TookanProvider.js
// Full Tookan API v2 integration for delivery dispatch

const DeliveryProvider = require("../base/DeliveryProvider");

// Tookan task status codes
const TOOKAN_STATUS = {
  0: "assigned",
  1: "started",
  2: "successful",
  3: "failed",
  4: "in_progress",
  6: "unassigned",
  7: "accepted",
  8: "decline",
  9: "cancel",
  10: "deleted",
};

class TookanProvider extends DeliveryProvider {
  constructor(config) {
    super(config);
    this.providerName = "tookan";
    this.apiKey = config.tookan?.apiKey;
    this.baseUrl = config.tookan?.baseUrl || "https://api.tookanapp.com/v2";
    this.timezone = config.tookan?.timezone || -300; // UTC offset in minutes. E.g. EST = -300, IST = -330, SGT = -480
    this.autoAssignment = config.tookan?.autoAssignment ?? true;
    this.teamId = config.tookan?.teamId || "";
    this.templateId = config.tookan?.templateId || "";
    this.notify = config.tookan?.notify ?? 1;           // 1 = send push notification to agent
    this.geofence = config.tookan?.geofence ?? 1;       // 1 = enable geofence for auto-assignment
    this.tags = config.tookan?.tags || "";               // comma-separated agent tags for filtering
    this.pickupCustomFieldTemplate = config.tookan?.pickupCustomFieldTemplate || "";
    this.deliveryCustomFieldTemplate = config.tookan?.deliveryCustomFieldTemplate || "";

    if (!this.apiKey) {
      console.warn("[TookanProvider] TOOKAN_API_KEY is not set. API calls will fail.");
    }
  }

  /**
   * Internal HTTP call to Tookan API
   */
  async _request(endpoint, body = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const payload = {
      api_key: this.apiKey,
      ...body,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status !== 200) {
      const msg = data.message || "Tookan API error";
      const err = new Error(msg);
      err.tookanStatus = data.status;
      err.tookanResponse = data;
      throw err;
    }

    return data;
  }

  /**
   * Create a pickup-and-delivery task pair in Tookan
   */
  async createTask(payload) {
    const tookanPayload = this.buildProviderPayload(payload);
    const data = await this._request("/create_task", tookanPayload);

    return {
      taskId: data.data?.job_id?.toString() || null,
      pickupTaskId: data.data?.pickup_job_id?.toString() || null,
      deliveryTaskId: data.data?.delivery_job_id?.toString() || null,
      trackingUrl: data.data?.tracking_link || null,
      pickupTrackingUrl: data.data?.pickup_tracking_link || null,
      deliveryTrackingUrl: data.data?.delivery_tracking_link || null,
      status: "created",
      raw: data,
    };
  }

  /**
   * Create a pickup-only task
   */
  async createPickupTask(payload) {
    const body = {
      order_id: payload.orderId || `ORD-${Date.now()}`,
      job_description: payload.notes || "Pickup task",
      job_pickup_phone: payload.pickup?.phone || "",
      job_pickup_name: payload.pickup?.name || "Store",
      job_pickup_address: payload.pickup?.address || "",
      job_pickup_latitude: payload.pickup?.latitude?.toString() || "",
      job_pickup_longitude: payload.pickup?.longitude?.toString() || "",
      job_pickup_datetime: payload.scheduledAt || this._nowFormatted(),
      has_pickup: 1,
      has_delivery: 0,
      layout_type: 0,
      tracking_link: 1,
      timezone: this.timezone,
      auto_assignment: this.autoAssignment ? 1 : 0,
    };

    if (this.teamId) body.team_id = this.teamId;

    const data = await this._request("/create_task", body);

    return {
      taskId: data.data?.job_id?.toString() || null,
      trackingUrl: data.data?.tracking_link || null,
      status: "created",
      raw: data,
    };
  }

  /**
   * Create a delivery-only task
   */
  async createDeliveryTask(payload) {
    const body = {
      order_id: payload.orderId || `ORD-${Date.now()}`,
      job_description: payload.notes || "Delivery task",
      customer_email: payload.customer?.email || "",
      customer_username: payload.customer?.name || "Customer",
      customer_phone: payload.customer?.phone || "",
      customer_address: payload.customer?.address || "",
      latitude: payload.customer?.latitude?.toString() || "",
      longitude: payload.customer?.longitude?.toString() || "",
      job_delivery_datetime: payload.scheduledAt || this._nowFormatted(),
      has_pickup: 0,
      has_delivery: 1,
      layout_type: 0,
      tracking_link: 1,
      timezone: this.timezone,
      auto_assignment: this.autoAssignment ? 1 : 0,
    };

    if (this.teamId) body.team_id = this.teamId;

    const data = await this._request("/create_task", body);

    return {
      taskId: data.data?.job_id?.toString() || null,
      trackingUrl: data.data?.tracking_link || null,
      status: "created",
      raw: data,
    };
  }

  /**
   * Get task status from Tookan
   */
  async getTaskStatus(taskId) {
    const data = await this._request("/get_task_details", {
      job_id: taskId,
    });

    const taskData = data.data?.[0] || {};

    return {
      taskId: taskData.job_id?.toString(),
      status: TOOKAN_STATUS[taskData.job_status] || "unknown",
      statusCode: taskData.job_status,
      agentName: taskData.fleet_name || null,
      agentPhone: taskData.fleet_phone || null,
      completedAt: taskData.completed_datetime || null,
      trackingUrl: taskData.tracking_link || null,
      details: {
        orderAddress: taskData.job_address,
        customerName: taskData.customer_username,
        customerPhone: taskData.customer_phone,
        jobDescription: taskData.job_description,
        createdAt: taskData.creation_datetime,
        startedAt: taskData.started_datetime,
      },
      raw: data,
    };
  }

  /**
   * Cancel a task in Tookan
   */
  async cancelTask(taskId) {
    const data = await this._request("/cancel_task", {
      job_id: taskId,
    });

    return {
      taskId,
      cancelled: true,
      raw: data,
    };
  }

  /**
   * Build Tookan-specific payload from normalized dispatch request.
   *
   * IMPORTANT — meta_data labels:
   *   The `label` values in meta_data MUST match the labels defined in your
   *   Tookan dashboard template (Dashboard → Settings → Templates → Edit).
   *   If a label doesn't match, Tookan will silently ignore the custom field.
   *
   * IMPORTANT — address formatting:
   *   Tookan uses Google Maps to parse customer_address / job_pickup_address.
   *   Apartment/suite/unit numbers often confuse Google Maps. Put them in
   *   job_description instead, not in the address string.
   */
  buildProviderPayload(payload) {
    const p = payload;
    const now = this._formatDatetime(new Date());

    // Build the description — include apt/suite if present
    let description = p.notes || "";
    if (p.customer?.addressLine2) {
      description = `${p.customer.addressLine2}${description ? " | " + description : ""}`;
    }

    const tookanPayload = {
      // ─── Order reference ─────────────────────────────────────
      order_id: p.orderId || `ORD-${Date.now()}`,
      job_description: description,

      // ─── Customer / Delivery destination ─────────────────────
      customer_email: p.customer?.email || "",
      customer_username: p.customer?.name || "Customer",
      customer_phone: p.customer?.phone || "",
      customer_address: p.customer?.formattedAddress || p.customer?.address || "",
      latitude: p.customer?.latitude?.toString() || "",
      longitude: p.customer?.longitude?.toString() || "",

      // ─── Pickup origin ───────────────────────────────────────
      job_pickup_phone: p.pickup?.phone || "",
      job_pickup_name: p.pickup?.name || "Store",
      job_pickup_email: p.pickup?.email || "",
      job_pickup_address: p.pickup?.address || "",
      job_pickup_latitude: p.pickup?.latitude?.toString() || "",
      job_pickup_longitude: p.pickup?.longitude?.toString() || "",

      // ─── Scheduling ──────────────────────────────────────────
      // Tookan accepts: "MM/DD/YYYY HH:mm" or "YYYY-MM-DD HH:mm:ss"
      job_delivery_datetime: p.scheduledAt ? this._normalizeDatetime(p.scheduledAt) : now,
      job_pickup_datetime: p.pickupAt ? this._normalizeDatetime(p.pickupAt) : now,

      // ─── Task type ───────────────────────────────────────────
      has_pickup: 1,
      has_delivery: 1,
      layout_type: 0, // 0 = pickup & delivery

      // ─── Tracking & notifications ────────────────────────────
      tracking_link: 1,
      notify: this.notify,        // 1 = push notification to agent on assignment
      geofence: this.geofence,    // 1 = use geofence for auto-assignment radius

      // ─── Assignment ──────────────────────────────────────────
      // timezone: UTC offset in minutes.
      //   Convert: hours_ahead_of_UTC × -60
      //   EST (UTC-5)  → -300  (subtract 300 min to get UTC)
      //   IST (UTC+5:30) → -330
      //   SGT (UTC+8)  → -480
      //   PST (UTC-8)  → 480   (add 480 min to get UTC)
      timezone: this.timezone,
      auto_assignment: this.autoAssignment ? 1 : 0,
    };

    // ─── Optional: team assignment ─────────────────────────────
    if (this.teamId) {
      tookanPayload.team_id = this.teamId;
    }

    // ─── Optional: direct agent assignment ─────────────────────
    // Pass fleet_id to assign to a specific agent instead of auto-assign
    if (p.fleetId || p.agentId) {
      tookanPayload.fleet_id = (p.fleetId || p.agentId).toString();
    }

    // ─── Optional: agent tags ──────────────────────────────────
    // Comma-separated tags to filter which agents can be auto-assigned
    if (p.tags || this.tags) {
      tookanPayload.tags = p.tags || this.tags;
    }

    // ─── Optional: custom field templates ──────────────────────
    // Template name must match exactly what's in Tookan dashboard
    if (this.templateId || p.templateName) {
      tookanPayload.template_name = p.templateName || this.templateId;
    }
    if (this.pickupCustomFieldTemplate || p.pickupTemplateName) {
      tookanPayload.pickup_custom_field_template = p.pickupTemplateName || this.pickupCustomFieldTemplate;
    }
    if (this.deliveryCustomFieldTemplate || p.deliveryTemplateName) {
      tookanPayload.custom_field_template = p.deliveryTemplateName || this.deliveryCustomFieldTemplate;
    }

    // ─── Optional: reference images ────────────────────────────
    // Array of image URLs shown to the agent
    if (p.refImages?.length) {
      tookanPayload.ref_images = p.refImages; // delivery reference images
    }
    if (p.pickupRefImages?.length) {
      tookanPayload.p_ref_images = p.pickupRefImages; // pickup reference images
    }

    // ─── Delivery meta_data (custom fields) ────────────────────
    // CRITICAL: label values must match your Tookan template labels exactly.
    // Go to Tookan Dashboard → Settings → Templates → Edit Template to see labels.
    tookanPayload.meta_data = [];

    if (p.metadata) {
      if (p.metadata.addressValidationStatus) {
        tookanPayload.meta_data.push({
          label: "Address Validation",
          data: p.metadata.addressValidationStatus,
        });
      }
      if (p.metadata.serviceAreaAllowed !== undefined) {
        tookanPayload.meta_data.push({
          label: "Service Area",
          data: p.metadata.serviceAreaAllowed ? "Allowed" : "Outside Area",
        });
      }
      if (p.metadata.addressProvider) {
        tookanPayload.meta_data.push({
          label: "Address Provider",
          data: p.metadata.addressProvider,
        });
      }
    }

    // Normalized address fields as custom fields for agent visibility
    if (p.customer?.addressLine1) {
      tookanPayload.meta_data.push(
        { label: "Address Line 1", data: p.customer.addressLine1 },
        { label: "Address Line 2", data: p.customer.addressLine2 || "" },
        { label: "City", data: p.customer.city || "" },
        { label: "State", data: p.customer.state || "" },
        { label: "Postal Code", data: p.customer.postalCode || "" },
        { label: "Country", data: p.customer.country || "" },
        { label: "Place ID", data: p.customer.placeId || "" }
      );
    }

    // Pass-through any extra custom meta_data from the caller
    if (p.customMetaData?.length) {
      tookanPayload.meta_data.push(...p.customMetaData);
    }

    // Clean up: remove meta_data if empty
    if (tookanPayload.meta_data.length === 0) {
      delete tookanPayload.meta_data;
    }

    // ─── Pickup meta_data (separate from delivery) ─────────────
    if (p.pickupMetaData?.length) {
      tookanPayload.pickup_meta_data = p.pickupMetaData;
    }

    return tookanPayload;
  }

  /**
   * Format a Date object for Tookan: "MM/DD/YYYY HH:mm"
   */
  _formatDatetime(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  _nowFormatted() {
    return this._formatDatetime(new Date());
  }

  /**
   * Normalize a date string to Tookan's expected format.
   * Accepts ISO 8601, "YYYY-MM-DD HH:mm:ss", or "MM/DD/YYYY HH:mm".
   * Returns "MM/DD/YYYY HH:mm".
   */
  _normalizeDatetime(str) {
    if (!str) return this._formatDatetime(new Date());

    // Already in Tookan format
    if (/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/.test(str)) return str;

    // Try parsing as Date
    const d = new Date(str);
    if (!isNaN(d.getTime())) return this._formatDatetime(d);

    // Return as-is if we can't parse (let Tookan handle it)
    return str;
  }
}

module.exports = TookanProvider;
