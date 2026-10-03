import type { Coordinate } from "./types";

/** Decode the Google encoded polyline format used by the observed route payloads. */
export function decodePolyline(encoded: string): Coordinate[] {
  const points: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latitudeDelta = decodeValue(encoded, () => index++);
    if (latitudeDelta === null) break;
    const longitudeDelta = decodeValue(encoded, () => index++);
    if (longitudeDelta === null) break;

    latitude += latitudeDelta;
    longitude += longitudeDelta;
    const lat = latitude / 1e5;
    const lon = longitude / 1e5;
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      points.push([lat, lon]);
    }
  }

  return points;
}

function decodeValue(encoded: string, nextIndex: () => number): number | null {
  let result = 0;
  let shift = 0;
  let byte: number;
  do {
    const currentIndex = nextIndex();
    if (currentIndex >= encoded.length) return null;
    byte = encoded.charCodeAt(currentIndex) - 63;
    if (byte < 0 || byte > 63) return null;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  return (result & 1) ? ~(result >> 1) : result >> 1;
}
