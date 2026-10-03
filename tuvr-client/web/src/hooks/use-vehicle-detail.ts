import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVehicleDetail } from "../lib/api";

export function useVehicleDetail(vehicleId: string | undefined) {
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const previousVisible = useRef(pageVisible);
  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);
  const query = useQuery({
    queryKey: ["vehicle-detail", vehicleId],
    queryFn: ({ signal }) => fetchVehicleDetail(vehicleId!, signal),
    enabled: Boolean(vehicleId),
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (currentQuery) => currentQuery.state.status === "error" ? false : 5_000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (pageVisible && !previousVisible.current && !query.isError && vehicleId) void query.refetch();
    previousVisible.current = pageVisible;
  }, [pageVisible, query.isError, query.refetch, vehicleId]);
  return { ...query, pageVisible };
}
