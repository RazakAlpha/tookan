// src/delivery/providers/index.js
// Factory: returns the configured delivery provider instance

const config = require("../../config");
const TookanProvider = require("./tookan/TookanProvider");
const MockDeliveryProvider = require("./mock/MockDeliveryProvider");

let _instance = null;

function getDeliveryProvider() {
  if (_instance) return _instance;

  switch (config.delivery.provider) {
    case "tookan":
      _instance = new TookanProvider(config.delivery);
      break;
    case "mock":
    default:
      _instance = new MockDeliveryProvider(config.delivery);
      break;
  }

  console.log(`[DeliveryProvider] Initialized: ${_instance.providerName}`);
  return _instance;
}

module.exports = { getDeliveryProvider };
