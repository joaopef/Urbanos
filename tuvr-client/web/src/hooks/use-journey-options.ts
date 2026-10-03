import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJourneyDetail, fetchRouteJourneys, fetchStopRouteJourneys } from "../lib/api";
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
      for (const routeId of routeIds) {
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
                route: (originRoutes ?? []).find((item) => item.route.id === routeId)!.route,
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
      return { ...result, candidateRouteIds: routeIds, incomplete, unconfirmedRouteIds: [...new Set(unconfirmedRouteIds)] };
    },
  });
}

function localIsoDate(): string { return getLisbonDateKey(new Date()); }
