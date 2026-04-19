// src/modules/address/providers/index.js
// Factory: returns the configured address provider instance

const config = require("../../config");
const GoogleAddressProvider = require("./google/GoogleAddressProvider");
const MapboxAddressProvider = require("./mapbox/MapboxAddressProvider");
const MockAddressProvider = require("./mock/MockAddressProvider");

let _instance = null;

function getAddressProvider() {
  if (_instance) return _instance;

  switch (config.address.provider) {
    case "google":
      _instance = new GoogleAddressProvider(config.address);
      break;
    case "mapbox":
      _instance = new MapboxAddressProvider(config.address);
      break;
    case "mock":
    default:
      _instance = new MockAddressProvider(config.address);
      break;
  }

  console.log(`[AddressProvider] Initialized: ${_instance.providerName}`);
  return _instance;
}

module.exports = { getAddressProvider };
