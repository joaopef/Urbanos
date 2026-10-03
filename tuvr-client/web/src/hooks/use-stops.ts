import { useQuery } from "@tanstack/react-query";
import { fetchStops } from "../lib/api";

export function useStops(enabled = true) {
  return useQuery({
    queryKey: ["stops"],
    queryFn: ({ signal }) => fetchStops(signal),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
