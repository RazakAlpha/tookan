// src/utils/geo.js
// Haversine distance and geo utilities

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a point is inside a polygon (ray casting)
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{lat: number, lng: number}>} polygon
 * @returns {boolean}
 */
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isValidLatitude(lat) {
  return typeof lat === "number" && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng) {
  return typeof lng === "number" && lng >= -180 && lng <= 180;
}

module.exports = { haversineDistance, isPointInPolygon, isValidLatitude, isValidLongitude };
