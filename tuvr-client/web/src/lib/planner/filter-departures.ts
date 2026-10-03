import type { JourneyOption } from "./types";
import { normalizeServiceTime, parseTimeInput, type TimeMode } from "../service-time";

export interface DepartureFilterCriteria {
  serviceDay: string;
  todayKey: string;
  nowSeconds: number;
  timeMode: TimeMode;
  manualTime: string;
  fullDay: boolean;
}

export interface DepartureFilterResult {
  visible: JourneyOption[];
  past: JourneyOption[];
  withoutTime: JourneyOption[];
}

export function filterDepartures(options: JourneyOption[], criteria: DepartureFilterCriteria): DepartureFilterResult {
  const withoutTime: JourneyOption[] = [];
  const timed = options.filter((option) => {
    if (normalizeServiceTime(option.leg.boarding.departureTime) === undefined) {
      withoutTime.push(option);
      return false;
    }
    return true;
  });
  const sortedTimed = [...timed].sort(compareOptions);
  const past = criteria.fullDay && criteria.serviceDay === criteria.todayKey
    ? sortedTimed.filter((option) => (normalizeServiceTime(option.leg.boarding.departureTime) ?? 0) < criteria.nowSeconds)
    : [];

  if (criteria.fullDay) return { visible: sortedTimed, past, withoutTime: sortUnknown(withoutTime) };

  const threshold = criteria.timeMode === "now"
    ? criteria.nowSeconds
    : parseTimeInput(criteria.manualTime) ?? 0;
  const visible = sortedTimed.filter((option) => (normalizeServiceTime(option.leg.boarding.departureTime) ?? 0) >= threshold);
  return { visible, past: [], withoutTime: sortUnknown(withoutTime) };
}

export function isPastDeparture(option: JourneyOption, criteria: DepartureFilterCriteria): boolean {
  const departure = normalizeServiceTime(option.leg.boarding.departureTime);
  return criteria.serviceDay === criteria.todayKey && departure !== undefined && departure < criteria.nowSeconds;
}

function compareOptions(a: JourneyOption, b: JourneyOption): number {
  const departureDelta = (normalizeServiceTime(a.leg.boarding.departureTime) ?? Number.MAX_SAFE_INTEGER)
    - (normalizeServiceTime(b.leg.boarding.departureTime) ?? Number.MAX_SAFE_INTEGER);
  if (departureDelta) return departureDelta;
  const aArrival = normalizeServiceTime(a.leg.alighting.arrivalTime ?? a.leg.alighting.departureTime) ?? Number.MAX_SAFE_INTEGER;
  const bArrival = normalizeServiceTime(b.leg.alighting.arrivalTime ?? b.leg.alighting.departureTime) ?? Number.MAX_SAFE_INTEGER;
  if (aArrival !== bArrival) return aArrival - bArrival;
  return a.id.localeCompare(b.id);
}

function sortUnknown(options: JourneyOption[]): JourneyOption[] {
  return [...options].sort((a, b) => a.id.localeCompare(b.id));
}
