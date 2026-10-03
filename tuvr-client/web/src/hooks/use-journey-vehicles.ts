import { useQueries } from "@tanstack/react-query";
import { fetchVehicleDetail } from "../lib/api";
import type { VehicleLocation } from "../lib/types";

export function useJourneyVehicles(vehicles: VehicleLocation[], routeId: string | undefined, journeyId: string | undefined, enabled: boolean) {
  const candidates = vehicles.filter((vehicle) => vehicle.routeId === routeId || vehicle.route?.id === routeId);
  const queries = useQueries({
    queries: candidates.map((vehicle) => ({
      queryKey: ["vehicle-detail", vehicle.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchVehicleDetail(vehicle.id, signal),
      enabled: enabled && Boolean(journeyId),
      staleTime: 5_000,
      retry: false,
    })),
  });
  const data = queries.flatMap((query, index) => {
    const detail = query.data;
    if (detail?.journey?.id === journeyId || detail?.journeyId === journeyId || candidates[index]?.journeyId === journeyId) {
      return [detail ?? candidates[index]];
    }
    return [];
  });
  return {
    data,
    isPending: enabled && queries.some((query) => query.isPending),
    isError: enabled && queries.some((query) => query.isError),
  };
}
