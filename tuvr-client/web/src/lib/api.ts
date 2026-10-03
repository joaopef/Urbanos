import { adaptRoute, adaptRouteDetail, adaptJourneyDetail, adaptStopRouteJourneys, adaptVehicleDetail, adaptVehicles, adaptStops, adaptStopRoutes } from "./adapters";
import type { JourneyDetail, RouteDetail, Stop, StopJourneyTime, StopRouteService, TransitRoute, VehicleDetail, VehicleLocation } from "./types";
import { isRecord } from "./guards";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://uvr.elevensystems.pt/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiError(response.status, `A API respondeu com HTTP ${response.status}.`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, "A API devolveu uma resposta que não é JSON válido.");
  }
}

export async function fetchRoutes(signal?: AbortSignal): Promise<TransitRoute[]> {
  const payload = await request<unknown>("/routes?passengerInfo=true", signal);
  return adaptRouteList(payload);
}

export async function fetchStops(signal?: AbortSignal): Promise<Stop[]> {
  const payload = await request<unknown>("/stops", signal);
  return adaptStops(payload);
}

export async function fetchStopRoutes(stopId: string, signal?: AbortSignal): Promise<StopRouteService[]> {
  const payload = await request<unknown>(`/stops/${encodeURIComponent(stopId)}/routes?passengerInfo=true`, signal);
  return adaptStopRoutes(payload);
}

export async function fetchStopRouteJourneys(stopId: string, routeId: string, day: string, signal?: AbortSignal): Promise<StopJourneyTime[]> {
  const query = new URLSearchParams({ day });
  const payload = await request<unknown>(`/stops/${encodeURIComponent(stopId)}/routes/${encodeURIComponent(routeId)}/journeys?${query.toString()}`, signal);
  return adaptStopRouteJourneys(payload);
}

export async function fetchRouteJourneys(routeId: string, day: string, signal?: AbortSignal): Promise<StopJourneyTime[]> {
  const query = new URLSearchParams({ day });
  const payload = await request<unknown>(`/routes/${encodeURIComponent(routeId)}/journeys?${query.toString()}`, signal);
  return adaptStopRouteJourneys(payload);
}

export async function fetchRouteDetail(routeId: string, signal?: AbortSignal): Promise<RouteDetail> {
  const payload = await request<unknown>(`/routes/${encodeURIComponent(routeId)}`, signal);
  return adaptRouteDetail(payload, routeId);
}

export async function fetchJourneyDetail(routeId: string, journeyId: string, signal?: AbortSignal): Promise<JourneyDetail | null> {
  const payload = await request<unknown>(`/routes/${encodeURIComponent(routeId)}/journeys/${encodeURIComponent(journeyId)}`, signal);
  return adaptJourneyDetail(payload, routeId, journeyId);
}

export async function fetchLocations(routeId?: string, signal?: AbortSignal): Promise<VehicleLocation[]> {
  const params = new URLSearchParams({ passengerInfo: "true" });
  if (routeId) params.set("routeId", routeId);
  const payload = await request<unknown>(`/locations?${params.toString()}`, signal);
  return adaptVehicles(payload);
}

export async function fetchVehicleDetail(vehicleId: string, signal?: AbortSignal): Promise<VehicleDetail> {
  const payload = await request<unknown>(`/locations/${encodeURIComponent(vehicleId)}`, signal);
  return adaptVehicleDetail(payload, vehicleId);
}

function adaptRouteList(payload: unknown): TransitRoute[] {
  if (Array.isArray(payload)) return payload.map(adaptRoute).filter((route): route is TransitRoute => route !== null);
  if (isRecord(payload)) {
    const collection = payload.routes ?? payload.items ?? payload.data;
    if (Array.isArray(collection)) return collection.map(adaptRoute).filter((route): route is TransitRoute => route !== null);
  }
  return [];
}
