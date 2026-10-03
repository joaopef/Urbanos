import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJourneyDetail, fetchRouteDetail, fetchRoutes, fetchRouteJourneys, fetchStopRouteJourneys } from "../lib/api";
import { findDirectConnections } from "../lib/planner/direct-connections";
import type { JourneySearchResult } from "../lib/planner/types";
import type { StopRouteService } from "../lib/types";
import { getLisbonDateKey } from "../lib/service-time";

export function useJourneyOptions(
  originId: string | undefined,
  destinationId: string | undefined,
  originRoutes: StopRouteService[] | undefined,
  destinationRoutes: StopRouteService[] | undefined,
  day = localIsoDate(),
) {
  const queryClient = useQueryClient();
  const routeIds = [...new Set((originRoutes ?? []).map((item) => item.route.id).filter((id) => (destinationRoutes ?? []).some((item) => item.route.id === id)))].sort();
  return useQuery<JourneySearchResult>({
    queryKey: ["journey-options", originId, destinationId, routeIds, day],
    enabled: Boolean(originId && destinationId && originId !== destinationId && originRoutes && destinationRoutes),
    retry: false,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const variants = [];
      let incomplete = false;
      const unconfirmedRouteIds: string[] = [];
      // The stop service endpoint can be empty outside today's operating hours.
      // Discover shared lines from the static stop catalog, then validate service
      // using the selected day's journeys. Cache this catalog across searches.
      const candidateRoutes = new Map((originRoutes ?? []).filter((item) => routeIds.includes(item.route.id)).map((item) => [item.route.id, item.route]));
      const catalog = await queryClient.fetchQuery({ queryKey: ["planner-route-catalog"], staleTime: Infinity, queryFn: async ({ signal: catalogSignal }) => {
        const routes = await queryClient.fetchQuery({ queryKey: ["routes"], queryFn: ({ signal: requestSignal }) => fetchRoutes(requestSignal), staleTime: Infinity });
        const details = [];
        let incomplete = false;
        for (let index = 0; index < routes.length; index += 4) {
          if (catalogSignal.aborted) throw new DOMException("Aborted", "AbortError");
          const batch = await Promise.allSettled(routes.slice(index, index + 4).map((route) => queryClient.fetchQuery({ queryKey: ["route-detail", route.id], queryFn: ({ signal: requestSignal }) => fetchRouteDetail(route.id, requestSignal), staleTime: Infinity })));
          for (const result of batch) { if (result.status === "fulfilled") details.push(result.value); else incomplete = true; }
        }
        return { details, incomplete };
      } });
      incomplete = catalog.incomplete;
      for (const detail of catalog.details) {
        if (detail.stops.some((stop) => stop.id === originId) && detail.stops.some((stop) => stop.id === destinationId)) candidateRoutes.set(detail.route.id, detail.route);
      }
      for (const routeId of candidateRoutes.keys()) {
        try {
          const [originTimes, destinationTimes] = await Promise.all([
            queryClient.fetchQuery({
              queryKey: ["stop-route-journeys", originId, routeId, day],
              queryFn: ({ signal: requestSignal }) => fetchStopRouteJourneys(originId!, routeId, day, requestSignal),
              staleTime: 60_000,
            }),
            queryClient.fetchQuery({
              queryKey: ["stop-route-journeys", destinationId, routeId, day],
              queryFn: ({ signal: requestSignal }) => fetchStopRouteJourneys(destinationId!, routeId, day, requestSignal),
              staleTime: 60_000,
            }),
          ]);
          const destinationJourneyIds = new Set(destinationTimes.map((item) => item.journeyId));
          let commonJourneyIds = [...new Set(originTimes.map((item) => item.journeyId))].filter((journeyId) => destinationJourneyIds.has(journeyId));
          if (!commonJourneyIds.length) {
            // Alguns dias/pares de paragens têm o catálogo por paragem incompleto.
            // A lista diária da linha permite recuperar esses journeyIds; a ordem
            // real continua a ser validada pelo detalhe da circulação abaixo.
            incomplete = true;
            const routeTimes = await queryClient.fetchQuery({
              queryKey: ["route-journeys", routeId, day],
              queryFn: ({ signal: requestSignal }) => fetchRouteJourneys(routeId, day, requestSignal),
              staleTime: 60_000,
            });
            commonJourneyIds = [...new Set(routeTimes.map((item) => item.journeyId))];
          }
          if (!commonJourneyIds.length) {
            unconfirmedRouteIds.push(routeId);
            continue;
          }
          for (let index = 0; index < commonJourneyIds.length; index += 2) {
            const batch = commonJourneyIds.slice(index, index + 2);
            const details = await Promise.all(batch.map((journeyId) => queryClient.fetchQuery({
              queryKey: ["journey-detail", routeId, journeyId, day],
              queryFn: ({ signal: requestSignal }) => fetchJourneyDetail(routeId, journeyId, requestSignal),
              staleTime: 60_000,
            })));
            for (const detail of details) {
              if (!detail) continue;
              variants.push({
                route: candidateRoutes.get(routeId)!,
                routeId,
                journeyId: detail.journeyId,
                day,
                direction: detail.direction,
                shape: detail.shape,
                occurrences: detail.circulations.map((circulation, occurrenceIndex) => ({
                  stop: circulation.stop,
                  order: occurrenceIndex,
                  sequence: circulation.sequence,
                  arrivalTime: circulation.arrivalTime,
                  departureTime: circulation.departureTime,
                })),
              });
            }
          }
          if (!commonJourneyIds.length || !variants.some((variant) => variant.routeId === routeId)) unconfirmedRouteIds.push(routeId);
        } catch (error) {
          if (signal.aborted) throw error;
          incomplete = true;
          unconfirmedRouteIds.push(routeId);
        }
      }
      const result = findDirectConnections(originId!, destinationId!, variants);
      return { ...result, candidateRouteIds: [...candidateRoutes.keys()], incomplete, unconfirmedRouteIds: [...new Set(unconfirmedRouteIds)] };
    },
  });
}

function localIsoDate(): string { return getLisbonDateKey(new Date()); }
