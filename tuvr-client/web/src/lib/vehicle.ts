import type { VehicleStop } from "./types";

export function selectUpcomingStops(stops: VehicleStop[], currentStopSequence?: number, limit = 4): VehicleStop[] {
  return [...stops]
    .filter((stop) => stop.dueInMinutes === undefined || stop.dueInMinutes >= 0)
    .filter((stop) => stop.dueInMinutes !== undefined || currentStopSequence === undefined || stop.sequence === undefined || stop.sequence > currentStopSequence)
    .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))
    .slice(0, limit);
}
