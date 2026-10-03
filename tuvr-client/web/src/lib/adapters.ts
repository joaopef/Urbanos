import { decodePolyline } from "./polyline";
import type { Coordinate, JourneyCirculation, JourneyDetail, OrderedRouteVariant, Position, RouteDetail, Stop, StopJourneyTime, StopRouteService, TransitRoute, VehicleDetail, VehicleLocation, VehicleStop } from "./types";
import { isRecord } from "./guards";

export function adaptRoute(value: unknown): TransitRoute | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.routeId);
  if (!id) return null;
  return {
    id,
    name: asString(value.name ?? value.nameShort) || `Linha ${id}`,
    nameShort: asOptionalString(value.nameShort),
    description: asOptionalString(value.description),
    color: normalizeColor(value.color),
    isActive: asOptionalBoolean(value.isActive),
  };
}

export function adaptStop(value: unknown): Stop | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.stopId);
  if (!id) return null;
  return {
    id,
    name: asString(value.name ?? value.nameShort) || `Paragem ${id}`,
    nameShort: asOptionalString(value.nameShort),
    position: adaptPosition(value.position ?? value),
    sequence: asOptionalNumber(value.sequence ?? value.stopSequence),
  };
}

export function adaptStops(payload: unknown): Stop[] {
  const items = collection(payload, ["stops", "items", "data"]);
  return items.map(adaptStop).filter((stop): stop is Stop => stop !== null);
}

export function adaptStopRoutes(payload: unknown): StopRouteService[] {
  return collection(payload, ["routes", "items", "data"]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const route = adaptRoute(value.route ?? value);
    if (!route) return [];
    const journeys = collection(value.journeys ?? value.services ?? value.circulations, ["items", "data"]).map(adaptJourney).filter((journey): journey is NonNullable<ReturnType<typeof adaptJourney>> => journey !== null);
    return [{ route, journeys }];
  });
}

export function adaptStopRouteJourneys(payload: unknown): StopJourneyTime[] {
  return collection(payload, ["journeys", "items", "data"]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const journeyId = asString(value.journeyId ?? value.id);
    if (!journeyId) return [];
    return [{
      journeyId,
      departure: asOptionalString(value.departure),
      departureTime: asOptionalNumber(value.departureTime),
      direction: asOptionalNumber(value.direction),
    }];
  });
}

export function adaptJourneyDetail(payload: unknown, routeId: string, journeyId: string): JourneyDetail | null {
  if (!isRecord(payload)) return null;
  const rawCirculations = collection(payload.circulations ?? payload.stops, ["items", "data"]);
  const circulations = rawCirculations.map(adaptJourneyCirculation);
  if (!rawCirculations.length || circulations.some((circulation) => circulation === null)) return null;
  const validCirculations = circulations.filter((circulation): circulation is JourneyCirculation => circulation !== null);
  return {
    routeId,
    journeyId,
    direction: asOptionalString(payload.direction),
    shape: adaptShape(payload.shape ?? payload.polyline),
    circulations: [...validCirculations].sort((a, b) => a.sequence - b.sequence),
  };
}

export function adaptRouteDetail(payload: unknown, fallbackRouteId: string): RouteDetail {
  const record = isRecord(payload) ? payload : {};
  const route = adaptRoute(record.route) ?? adaptRoute(record) ?? {
    id: fallbackRouteId,
    name: `Linha ${fallbackRouteId}`,
  };
  const stops = collection(record.stops ?? record.stations ?? record.routeStops, ["items", "data"])
    .map(adaptStop)
    .filter((stop): stop is Stop => stop !== null)
    .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER));
  const rawVariants = collection(record.variants ?? record.directions ?? record.routeVariants ?? record.journeys, ["items", "data"]);
  const variants = rawVariants.map(adaptOrderedVariant).filter((variant): variant is OrderedRouteVariant => variant !== null);
  return { route, stops, shape: adaptShape(record.shape ?? record.polyline), variants, variantDataAvailable: rawVariants.length > 0 };
}

export function adaptVehicle(value: unknown): VehicleLocation | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id ?? value.vehicleId ?? value.locationId);
  if (!id) return null;
  const route = adaptRoute(value.route);
  const journey = isRecord(value.journey) ? value.journey : undefined;
  return {
    id,
    position: adaptPosition(value.position ?? value),
    route: route ?? undefined,
    routeId: asOptionalString(value.routeId ?? route?.id),
    journeyId: asOptionalString(value.journeyId ?? journey?.id),
    color: normalizeColor(value.color ?? route?.color),
    status: asOptionalString(value.status),
    busStatus: asOptionalString(value.busStatus),
    speed: asOptionalNumber(value.speed),
    delay: asOptionalNumber(value.delay),
    sourceUpdatedAt: asOptionalString(value.updatedAt ?? value.timestamp ?? value.positionTime),
  };
}

export function adaptVehicles(payload: unknown): VehicleLocation[] {
  return collection(payload, ["locations", "vehicles", "items", "data"])
    .map(adaptVehicle)
    .filter((vehicle): vehicle is VehicleLocation => vehicle !== null);
}

export function adaptVehicleDetail(payload: unknown, fallbackId: string): VehicleDetail {
  const base = adaptVehicle(payload) ?? { id: fallbackId };
  const record = isRecord(payload) ? payload : {};
  const journeyValue = record.journey;
  const journey = isRecord(journeyValue) ? {
    id: asOptionalString(journeyValue.id),
    name: asOptionalString(journeyValue.name),
    description: asOptionalString(journeyValue.description),
    direction: asOptionalString(journeyValue.direction),
    startTime: asOptionalString(journeyValue.startTime),
    endTime: asOptionalString(journeyValue.endTime),
    isActive: asOptionalBoolean(journeyValue.isActive),
    type: asOptionalString(journeyValue.type),
  } : undefined;
  const stopItems = collection(record.journey && isRecord(record.journey) ? record.journey.circulations : record.circulations ?? record.progress, ["items", "data"]);
  return {
    ...base,
    journey,
    stops: stopItems.map(adaptVehicleStop).filter((stop): stop is VehicleStop => stop !== null),
    currentStopSequence: asOptionalNumber(record.currentStopSequence),
    fleetId: asOptionalString(record.fleetId),
    licensePlate: asOptionalString(record.licensePlate),
  };
}

function adaptVehicleStop(value: unknown): VehicleStop | null {
  if (!isRecord(value)) return null;
  const stage = isRecord(value.stage) ? value.stage : value;
  const nestedStop = isRecord(stage.stop) ? stage.stop : stage;
  const stopValue = { ...nestedStop, sequence: value.sequence ?? stage.sequence ?? nestedStop.sequence };
  const stop = adaptStop(stopValue);
  if (!stop) return null;
  return {
    ...stop,
    arrivalTime: asOptionalString(value.arrivalTime ?? stage.arrivalTime),
    departureTime: asOptionalString(value.departureTime ?? stage.departureTime),
    dueInMinutes: asOptionalNumber(value.dueInMinutes ?? stage.dueInMinutes),
    stage: asOptionalString(value.stageName ?? stage.name),
  };
}

function adaptOrderedVariant(value: unknown): OrderedRouteVariant | null {
  if (!isRecord(value)) return null;
  const rawStops = collection(value.stops ?? value.stopSequence ?? value.stages ?? value.circulations, ["items", "data"]);
  const stops = rawStops.map(adaptVariantStop).filter((stop): stop is Stop => stop !== null);
  if (stops.length < 2 || stops.some((stop) => stop.sequence === undefined)) return null;
  return {
    routeId: asOptionalString(value.routeId),
    journeyId: asOptionalString(value.journeyId ?? value.id),
    direction: asOptionalString(value.direction ?? value.name),
    stops: [...stops].sort((a, b) => (a.sequence! - b.sequence!)),
  };
}

function adaptJourneyCirculation(value: unknown): JourneyCirculation | null {
  if (!isRecord(value)) return null;
  const stage = isRecord(value.stage) ? value.stage : value;
  const nestedStop = isRecord(stage.stop) ? stage.stop : stage;
  const sequence = asNumber(value.sequence ?? stage.sequence ?? nestedStop.sequence);
  const stop = adaptStop({ ...nestedStop, sequence });
  if (sequence === undefined || !stop) return null;
  return {
    sequence,
    stop,
    arrivalTime: asOptionalNumber(value.arrivalTime ?? stage.arrivalTime),
    departureTime: asOptionalNumber(value.departureTime ?? stage.departureTime),
    delay: asOptionalNumber(value.delay ?? stage.delay),
    nextArrivalTime: asOptionalNumber(value.nextArrivalTime ?? stage.nextArrivalTime),
    dueInMinutes: asOptionalNumber(value.dueInMinutes ?? stage.dueInMinutes),
  };
}

function adaptVariantStop(value: unknown): Stop | null {
  if (!isRecord(value)) return null;
  const stage = isRecord(value.stage) ? value.stage : value;
  const nestedStop = isRecord(stage.stop) ? stage.stop : stage;
  return adaptStop({ ...nestedStop, sequence: value.sequence ?? stage.sequence ?? nestedStop.sequence });
}

function adaptJourney(value: unknown) {
  if (!isRecord(value)) return null;
  return {
    id: asOptionalString(value.id),
    name: asOptionalString(value.name),
    description: asOptionalString(value.description),
    direction: asOptionalString(value.direction),
    start: asOptionalNumber(value.start) ?? asOptionalString(value.start),
    end: asOptionalNumber(value.end) ?? asOptionalString(value.end),
    startTime: asOptionalNumber(value.startTime) ?? asOptionalString(value.startTime),
    endTime: asOptionalNumber(value.endTime) ?? asOptionalString(value.endTime),
    isActive: asOptionalBoolean(value.isActive),
    type: asOptionalString(value.type),
  };
}

function adaptPosition(value: unknown): Position | undefined {
  if (!isRecord(value)) return undefined;
  const lat = asNumber(value.lat ?? value.latitude);
  const lon = asNumber(value.lon ?? value.lng ?? value.longitude);
  if (lat === undefined || lon === undefined || Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat, lon };
}

function adaptShape(value: unknown): Coordinate[] {
  if (typeof value === "string") return decodePolyline(value);
  if (!Array.isArray(value)) return [];
  return value.flatMap((point): Coordinate[] => {
    if (Array.isArray(point) && point.length >= 2) {
      const lat = asNumber(point[0]);
      const lon = asNumber(point[1]);
      return lat !== undefined && lon !== undefined && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [[lat, lon]] : [];
    }
    if (isRecord(point)) {
      const position = adaptPosition(point);
      return position ? [[position.lat, position.lon]] : [];
    }
    return [];
  });
}

function collection(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

export function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (/^#?[0-9a-f]{6}$/i.test(trimmed)) return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#?[0-9a-f]{3}$/i.test(trimmed)) return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asOptionalString(value: unknown): string | undefined { return asString(value); }
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}
function asOptionalNumber(value: unknown): number | undefined { return asNumber(value); }
function asOptionalBoolean(value: unknown): boolean | undefined { return typeof value === "boolean" ? value : undefined; }
