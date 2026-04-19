// src/utils/response.js
// Consistent JSON response helpers

function success(data, meta = {}) {
  return { success: true, data, ...meta };
}

function error(message, code = "UNKNOWN_ERROR", details = null) {
  const res = { success: false, error: { code, message } };
  if (details) res.error.details = details;
  return res;
}

module.exports = { success, error };
