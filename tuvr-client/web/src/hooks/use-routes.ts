import { useQuery } from "@tanstack/react-query";
import { fetchRoutes } from "../lib/api";

export function useRoutes() {
  return useQuery({
    queryKey: ["routes"],
    queryFn: ({ signal }) => fetchRoutes(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
