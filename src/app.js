// src/app.js
// Express application setup

const express = require("express");
const cors = require("cors");
const addressRoutes = require("./address/routes/addressRoutes");
const deliveryRoutes = require("./delivery/routes/deliveryRoutes");
const config = require("./config");

const app = express();

if (config.env === "production") {
  app.set("trust proxy", 1);
}

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ─── Request logging (dev) ──────────────────────────────────────────
if (config.env === "development") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  });
}

// ─── Health check ───────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    providers: {
      address: config.address.provider,
      delivery: config.delivery.provider,
    },
  });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use("/api/address", addressRoutes);
app.use("/api/delivery", deliveryRoutes);

// ─── 404 handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
});

// ─── Error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Server Error]", err);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
});

module.exports = app;
