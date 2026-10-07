// Reine Geometrie ohne React und Leaflet, damit sie für weitere Features wiederverwendbar ist.

export const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Mittelpunktswinkel zwischen zwei Punkten auf der Kugel (Haversine), in Radiant.
export function centralAngle(a, b) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Direkte Entfernung (Luftlinie im Raum) vom Nutzer auf der Erdoberfläche zur ISS in ihrer Höhe.
// Kugel-Erde: Abweichung zum Ellipsoid unter 0,5 %.
export function distanceToIssKm(user, iss) {
  const r1 = EARTH_RADIUS_KM;
  const r2 = EARTH_RADIUS_KM + iss.altitude;
  const gamma = centralAngle(user, iss);
  return Math.sqrt(r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(gamma));
}
