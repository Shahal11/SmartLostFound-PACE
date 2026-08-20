/**
 * src/utils/locationUtils.js
 * Utility functions for geolocation calculations and validations.
 */

// Earth's radius in meters
const EARTH_RADIUS_M = 6371000;

/**
 * Validates if the given latitude and longitude are within valid ranges.
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidCoordinates(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the distance between two coordinates using the Haversine formula.
 * @param {{lat: number, lon: number}} point1
 * @param {{lat: number, lon: number}} point2
 * @returns {number} Distance in meters.
 */
function getDistance(point1, point2) {
  if (
    !isValidCoordinates(point1.lat, point1.lon) ||
    !isValidCoordinates(point2.lat, point2.lon)
  ) {
    throw new Error('Invalid coordinates provided.');
  }

  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLon = toRadians(point2.lon - point1.lon);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Checks if a point is inside a circle defined by a center and radius.
 * @param {{lat: number, lon: number}} point
 * @param {{lat: number, lon: number}} center
 * @param {number} radiusMeters
 * @returns {boolean}
 */
function isPointInsideCircle(point, center, radiusMeters) {
  if (typeof radiusMeters !== 'number' || radiusMeters < 0) {
    throw new Error('Radius must be a non-negative number.');
  }
  const distance = getDistance(point, center);
  return distance <= radiusMeters;
}

module.exports = {
  isValidCoordinates,
  getDistance,
  isPointInsideCircle
};