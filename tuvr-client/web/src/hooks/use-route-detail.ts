import { useQuery } from "@tanstack/react-query";
import { fetchRouteDetail } from "../lib/api";

export function useRouteDetail(routeId: string | undefined) {
  return useQuery({
    queryKey: ["route-detail", routeId],
    queryFn: ({ signal }) => fetchRouteDetail(routeId!, signal),
    enabled: Boolean(routeId),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
