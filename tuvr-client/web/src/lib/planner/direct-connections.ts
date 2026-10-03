import type { RouteDetail, Stop } from "../types";
import type { JourneyOption, JourneySearchResult, RouteVariant, StopOccurrence } from "./types";

export function variantsFromRouteDetail(detail: RouteDetail): RouteVariant[] {
  return detail.variants.map((variant) => ({
    route: detail.route,
    routeId: variant.routeId ?? detail.route.id,
    journeyId: variant.journeyId,
    day: variant.day,
    direction: variant.direction,
    shape: detail.shape,
    occurrences: variant.stops.map((stop, index) => ({ stop, order: index, sequence: stop.sequence })),
  }));
}

export function findDirectConnections(originId: string, destinationId: string, variants: RouteVariant[]): JourneySearchResult {
  const candidateRouteIds = [...new Set(variants.map((variant) => variant.route.id))];
  const options: JourneyOption[] = [];
  for (const [variantIndex, variant] of variants.entries()) {
    const origins = occurrencesOf(variant.occurrences, originId);
    const destinations = occurrencesOf(variant.occurrences, destinationId);
    const routeId = variant.routeId ?? variant.route.id;
    const variantId = variant.journeyId ?? `variant-${variantIndex}`;
    const day = variant.day ?? "any-day";
    for (const boarding of origins) {
      for (const alighting of destinations) {
        if (boarding.order >= alighting.order) continue;
        options.push({
          id: `${routeId}:${variantId}:${day}:${boarding.order}:${alighting.order}`,
          kind: "direct",
          quality: "confirmed",
          leg: {
            route: variant.route,
            routeId,
            journeyId: variant.journeyId,
            day: variant.day,
            direction: variant.direction,
            shape: variant.shape,
            boarding,
            alighting,
            intermediateStops: variant.occurrences.filter((occurrence) => occurrence.order > boarding.order && occurrence.order < alighting.order),
          },
        });
      }
    }
  }
  const unique = new Map<string, JourneyOption>();
  for (const option of options) {
    const key = `${option.leg.routeId ?? option.leg.route.id}:${option.leg.journeyId ?? "unknown-journey"}:${option.leg.day ?? "any-day"}:${option.leg.boarding.order}:${option.leg.alighting.order}:${option.leg.direction ?? ""}`;
    if (!unique.has(key)) unique.set(key, option);
  }
  return {
    options: [...unique.values()].sort((a, b) => {
      const departureDelta = (a.leg.boarding.departureTime ?? Number.MAX_SAFE_INTEGER) - (b.leg.boarding.departureTime ?? Number.MAX_SAFE_INTEGER);
      if (departureDelta) return departureDelta;
      const arrivalDelta = (a.leg.alighting.arrivalTime ?? a.leg.alighting.departureTime ?? Number.MAX_SAFE_INTEGER) - (b.leg.alighting.arrivalTime ?? b.leg.alighting.departureTime ?? Number.MAX_SAFE_INTEGER);
      if (arrivalDelta) return arrivalDelta;
      const stopDelta = a.leg.intermediateStops.length - b.leg.intermediateStops.length;
      return stopDelta || a.leg.route.name.localeCompare(b.leg.route.name, "pt");
    }),
    incomplete: false,
    candidateRouteIds,
    unconfirmedRouteIds: [],
  };
}

export function occurrencesOf(occurrences: StopOccurrence[], stopId: string): StopOccurrence[] {
  return occurrences.filter((occurrence) => occurrence.stop.id === stopId);
}

export function stopFromOccurrence(occurrence: StopOccurrence): Stop { return occurrence.stop; }
