import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVehicleDetail } from "../lib/api";
import type { VehicleDetail, VehicleLocation } from "../lib/types";

// Positions omit route IDs in the live API. Load details for returned vehicles,
// in batches of two, sharing the cache used by the selected vehicle's panel.
export function useVehicleSummaries(vehicles: VehicleLocation[], enabled: boolean) {
  const client = useQueryClient();
  const ids = vehicles.filter((vehicle) => !vehicle.route && !vehicle.routeId).map((vehicle) => vehicle.id).sort();
  return useQuery<Record<string, VehicleDetail>>({
    queryKey: ["vehicle-summaries", ids],
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async ({ signal }) => {
      const result: Record<string, VehicleDetail> = {};
      for (let index = 0; index < ids.length; index += 2) {
        signal.throwIfAborted();
        await Promise.all(ids.slice(index, index + 2).map(async (id) => {
          try {
            result[id] = await client.fetchQuery({
              queryKey: ["vehicle-detail", id],
              queryFn: ({ signal: requestSignal }) => fetchVehicleDetail(id, requestSignal),
              staleTime: 60_000,
              retry: false,
            });
          } catch {
            // A vehicle may leave service between positions and detail requests.
            signal.throwIfAborted();
          }
        }));
      }
      return result;
    },
  });
}
