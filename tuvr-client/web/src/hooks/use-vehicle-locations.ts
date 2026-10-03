import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLocations } from "../lib/api";

const POLL_INTERVAL_MS = 5_000;

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");

  useEffect(() => {
    const onVisibilityChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return visible;
}

export function useVehicleLocations(routeId: string | undefined, mapMounted = true) {
  const pageVisible = usePageVisible();
  const previousVisible = useRef(pageVisible);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => { setBlocked(false); }, [routeId]);
  const query = useQuery({
    queryKey: ["vehicle-locations", routeId ?? "all"],
    queryFn: ({ signal }) => fetchLocations(routeId, signal),
    enabled: mapMounted && pageVisible && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (currentQuery) => currentQuery.state.status === "error" ? false : POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (query.isError) setBlocked(true);
  }, [query.isError]);

  useEffect(() => {
    if (pageVisible && !previousVisible.current && mapMounted && !blocked && !query.isError && !query.isFetching) void query.refetch();
    previousVisible.current = pageVisible;
  }, [blocked, mapMounted, pageVisible, query.isError, query.isFetching, query.refetch]);

  const isBlocked = blocked || query.isError;
  const isStale = Boolean(query.dataUpdatedAt && Date.now() - query.dataUpdatedAt > POLL_INTERVAL_MS * 2) || isBlocked;

  return {
    ...query,
    pageVisible,
    isBlocked,
    isStale,
    pollIntervalMs: POLL_INTERVAL_MS,
    reconnect: async () => {
      setBlocked(false);
      const result = await query.refetch();
      if (result.isError) setBlocked(true);
      return result;
    },
  };
}
