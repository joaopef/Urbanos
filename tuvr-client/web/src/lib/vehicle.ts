import type { Stop, VehicleStop } from "./types";

export function getDirectionLabel(direction: string | undefined, stops: Pick<Stop, "name" | "sequence">[]): string | undefined {
  const text = direction?.trim();
  if (text && !/^\d+$/.test(text)) return text;
  if (!stops.length || stops.some((stop) => stop.sequence === undefined)) return undefined;
  const terminal = [...stops].sort((a, b) => a.sequence! - b.sequence!).at(-1);
  return terminal?.name ? `Sentido ${terminal.name}` : undefined;
}

export function selectUpcomingStops(stops: VehicleStop[], currentStopSequence?: number, limit = Infinity): VehicleStop[] {
  return [...stops]
    .filter((stop) => stop.dueInMinutes === undefined || stop.dueInMinutes >= 0)
    .filter((stop) => stop.dueInMinutes !== undefined || currentStopSequence === undefined || stop.sequence === undefined || stop.sequence > currentStopSequence)
    .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))
    .slice(0, limit);
}
