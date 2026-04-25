// src/config/index.js
// Centralized config from environment variables

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  env: process.env.NODE_ENV || "development",

  address: {
    provider: process.env.ADDRESS_PROVIDER || "mock",
    autocomplete: {
      minChars: parseInt(process.env.ADDRESS_AUTOCOMPLETE_MIN_CHARS, 10) || 3,
      debounceMs: parseInt(process.env.ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS, 10) || 300,
      maxResults: parseInt(process.env.ADDRESS_AUTOCOMPLETE_MAX_RESULTS, 10) || 5,
      countryBias: process.env.ADDRESS_AUTOCOMPLETE_COUNTRY_BIAS || "us",
    },
    serviceArea: {
      mode: process.env.ADDRESS_SERVICE_AREA_MODE || "radius",
    },
    google: {
      mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      placesApiKey: process.env.GOOGLE_PLACES_API_KEY || "",
    },
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN || "",
    },
  },

  delivery: {
    provider: process.env.DELIVERY_PROVIDER || "mock",
    tookan: {
      apiKey: process.env.TOOKAN_API_KEY || "",
      baseUrl: process.env.TOOKAN_BASE_URL || "https://api.tookanapp.com/v2",
      timezone: isNaN(parseInt(process.env.TOOKAN_TIMEZONE, 10)) ? -300 : parseInt(process.env.TOOKAN_TIMEZONE, 10),
      autoAssignment: process.env.TOOKAN_AUTO_ASSIGNMENT !== "0", // default true, set "0" to disable
      teamId: process.env.TOOKAN_TEAM_ID || "",
      templateId: process.env.TOOKAN_TEMPLATE_ID || "",
      notify: isNaN(parseInt(process.env.TOOKAN_NOTIFY, 10)) ? 1 : parseInt(process.env.TOOKAN_NOTIFY, 10),
      geofence: isNaN(parseInt(process.env.TOOKAN_GEOFENCE, 10)) ? 1 : parseInt(process.env.TOOKAN_GEOFENCE, 10),
      tags: process.env.TOOKAN_TAGS || "",
      pickupCustomFieldTemplate: process.env.TOOKAN_PICKUP_TEMPLATE || "",
      deliveryCustomFieldTemplate: process.env.TOOKAN_DELIVERY_TEMPLATE || "",
    },
  },

  rateLimit: {
    autocomplete: {
      windowMs: parseInt(process.env.RATE_LIMIT_AUTOCOMPLETE_WINDOW_MS, 10) || 60000,
      max: parseInt(process.env.RATE_LIMIT_AUTOCOMPLETE_MAX, 10) || 60,
    },
    dispatch: {
      windowMs: parseInt(process.env.RATE_LIMIT_DISPATCH_WINDOW_MS, 10) || 60000,
      max: parseInt(process.env.RATE_LIMIT_DISPATCH_MAX, 10) || 20,
    },
  },
};

module.exports = config;
