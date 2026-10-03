import type { Stop } from "./types";

export const SAVED_TRIPS_KEY = "urbanos:saved-trips:v1";
export const RECENT_TRIPS_LIMIT = 5;
export interface SavedTrip { originId: string; destinationId: string; name?: string; }
export interface SavedTrips { favorites: SavedTrip[]; recent: SavedTrip[]; }

export function parseSavedTrips(raw: string | null): SavedTrips {
  if (!raw) return { favorites: [], recent: [] };
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return { favorites: [], recent: [] };
    return { favorites: dedupe(parseList(value.favorites)), recent: dedupe(parseList(value.recent)).slice(0, RECENT_TRIPS_LIMIT) };
  } catch { return { favorites: [], recent: [] }; }
}

export function serializeSavedTrips(trips: SavedTrips): string { return JSON.stringify(trips); }
export function tripKey(trip: Pick<SavedTrip, "originId" | "destinationId">) { return `${trip.originId}\u0000${trip.destinationId}`; }
export function addRecentTrip(trips: SavedTrips, trip: SavedTrip): SavedTrips {
  const valid = cleanTrip(trip);
  if (!valid) return trips;
  const recent = [valid, ...trips.recent.filter((entry) => tripKey(entry) !== tripKey(trip))].slice(0, RECENT_TRIPS_LIMIT);
  return { ...trips, recent };
}
export function toggleFavorite(trips: SavedTrips, trip: SavedTrip): SavedTrips {
  const valid = cleanTrip(trip);
  if (!valid) return trips;
  const key = tripKey(trip);
  return { ...trips, favorites: trips.favorites.some((entry) => tripKey(entry) === key)
    ? trips.favorites.filter((entry) => tripKey(entry) !== key)
    : [valid, ...trips.favorites] };
}
export function resolveTripStops(trip: SavedTrip, stops: Stop[]) {
  return { origin: stops.find((stop) => stop.id === trip.originId), destination: stops.find((stop) => stop.id === trip.destinationId) };
}
export function parseSharedTrip(search: string): { originId: string; destinationId: string } | undefined {
  try {
    decodeURIComponent(search);
    const params = new URLSearchParams(search);
    const originId = params.get("from"), destinationId = params.get("to");
    return originId && destinationId && originId !== destinationId && originId.length <= 128 && destinationId.length <= 128
      ? { originId, destinationId } : undefined;
  } catch { return undefined; }
}
export function createShareUrl(originId: string, destinationId: string, base = window.location.href) {
  const url = new URL(base);
  url.search = "";
  url.searchParams.set("from", originId);
  url.searchParams.set("to", destinationId);
  return url.toString();
}
function parseList(value: unknown): SavedTrip[] { return Array.isArray(value) ? value.map(cleanTrip).filter((item): item is SavedTrip => Boolean(item)) : []; }
function dedupe(values: SavedTrip[]) { const seen = new Set<string>(); return values.filter((item) => { const key = tripKey(item); if (seen.has(key)) return false; seen.add(key); return true; }); }
function cleanTrip(value: unknown): SavedTrip | undefined {
  if (!isRecord(value) || typeof value.originId !== "string" || typeof value.destinationId !== "string" || !value.originId.trim() || !value.destinationId.trim() || value.originId === value.destinationId || value.originId.length > 128 || value.destinationId.length > 128) return undefined;
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 60) : "";
  return { originId: value.originId, destinationId: value.destinationId, ...(name ? { name } : {}) };
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
