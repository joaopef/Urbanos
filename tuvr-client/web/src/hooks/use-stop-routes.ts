import { useQuery } from "@tanstack/react-query";
import { fetchStopRoutes } from "../lib/api";

export function useStopRoutes(stopId: string | undefined) {
  return useQuery({
    queryKey: ["stop-routes", stopId],
    queryFn: ({ signal }) => fetchStopRoutes(stopId!, signal),
    enabled: Boolean(stopId),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
