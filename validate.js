// src/middleware/validate.js
// Request validation middleware

/**
 * Validates request query params against a schema object
 * Schema: { paramName: { required: bool, type: 'string'|'number', min: number, max: number } }
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [param, rules] of Object.entries(schema)) {
      const value = req.query[param];

      if (rules.required && (value === undefined || value === "")) {
        errors.push(`Query param '${param}' is required`);
        continue;
      }

      if (value === undefined) continue;

      if (rules.type === "number") {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`'${param}' must be a number`);
        } else {
          if (rules.min !== undefined && num < rules.min) errors.push(`'${param}' must be >= ${rules.min}`);
          if (rules.max !== undefined && num > rules.max) errors.push(`'${param}' must be <= ${rules.max}`);
        }
      }

      if (rules.type === "string") {
        if (rules.minLength && value.length < rules.minLength)
          errors.push(`'${param}' must be at least ${rules.minLength} characters`);
        if (rules.maxLength && value.length > rules.maxLength)
          errors.push(`'${param}' must be at most ${rules.maxLength} characters`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: errors },
      });
    }
    next();
  };
}

/**
 * Validates request body against a schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = getNestedValue(body, field);

      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(`'${field}' is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rules.type === "number" && typeof value !== "number") {
        errors.push(`'${field}' must be a number`);
      }
      if (rules.type === "string" && typeof value !== "string") {
        errors.push(`'${field}' must be a string`);
      }
      if (rules.type === "boolean" && typeof value !== "boolean") {
        errors.push(`'${field}' must be a boolean`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: errors },
      });
    }
    next();
  };
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

module.exports = { validateQuery, validateBody };
