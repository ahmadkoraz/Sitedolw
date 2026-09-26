/**
 * @license
 * SITEFLOW Geofencing & Purpose-Limited GPS Verification Engine
 * Strictly purpose-limited to attendance verification at clock events.
 * No continuous background tracking.
 */

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Calculates accurate great-circle distance between two points using the Haversine formula
 * @returns distance in meters rounded to nearest integer
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates whether coordinates fall inside the designated Job Site geofence
 */
export function verifyGeofence(
  workerLat: number,
  workerLon: number,
  siteLat: number,
  siteLon: number,
  radiusMeters: number
): { isWithin: boolean; distanceMeters: number } {
  const distanceMeters = calculateDistanceMeters(workerLat, workerLon, siteLat, siteLon);
  return {
    isWithin: distanceMeters <= radiusMeters,
    distanceMeters,
  };
}

/**
 * Purpose-limited single-shot GPS capture.
 * Captures device location ONLY at the instant of Clock In / Clock Out.
 */
export async function getPurposeLimitedPosition(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser/device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location access was denied. Please allow GPS permission to verify attendance on site.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is currently unavailable. Please verify device GPS is active.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Please try again in an area with clear sky visibility.'));
            break;
          default:
            reject(new Error('An unknown error occurred while acquiring GPS coordinates.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Human readable distance formatting (e.g., "45 m" or "1.4 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
