// src/server.js
// Start the Express server

require("dotenv").config();
const app = require("./app");
const config = require("./config");

app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  Delivery Plugin Server                          ║
║──────────────────────────────────────────────────║
║  Port:              ${String(config.port).padEnd(28)}║
║  Environment:       ${config.env.padEnd(28)}║
║  Address Provider:  ${config.address.provider.padEnd(28)}║
║  Delivery Provider: ${config.delivery.provider.padEnd(28)}║
╠══════════════════════════════════════════════════╣
║  Address Routes:                                 ║
║    GET  /api/address/autocomplete?q=...          ║
║    GET  /api/address/place/:placeId              ║
║    POST /api/address/validate                    ║
║    POST /api/address/reverse-geocode             ║
║    POST /api/address/service-check               ║
║  Delivery Routes:                                ║
║    POST /api/delivery/dispatch                   ║
║    POST /api/delivery/dispatch/delivery-only     ║
║    POST /api/delivery/dispatch/pickup-only       ║
║    POST /api/delivery/dispatch/preview           ║
║    GET  /api/delivery/task/:taskId               ║
║    POST /api/delivery/task/:taskId/cancel         ║
╚══════════════════════════════════════════════════╝
  `);
});
