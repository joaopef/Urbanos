import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouteDetail } from "./hooks/use-route-detail";
import { useRoutes } from "./hooks/use-routes";
import { useVehicleLocations } from "./hooks/use-vehicle-locations";
import { useVehicleSummaries } from "./hooks/use-vehicle-summaries";
import { useStops } from "./hooks/use-stops";
import { useStopRoutes } from "./hooks/use-stop-routes";
import { useJourneyOptions } from "./hooks/use-journey-options";
import { useJourneyVehicles } from "./hooks/use-journey-vehicles";
import { ConnectionStatus } from "./components/connection-status";
import { JourneyPlanner } from "./components/journey-planner";
import { RouteSelector } from "./components/route-selector";
import { TransitMap } from "./components/transit-map";
import { VehicleDetails } from "./components/vehicle-details";
import { VehicleList } from "./components/vehicle-list";
import { SavedTripsShelf } from "./components/saved-trips-shelf";
import { addRecentTrip, createShareUrl, parseSavedTrips, parseSharedTrip, resolveTripStops, SAVED_TRIPS_KEY, serializeSavedTrips, toggleFavorite, tripKey, type SavedTrip, type SavedTrips } from "./lib/saved-trips";
import type { JourneyOption } from "./lib/planner/types";
import { getLisbonClockSeconds, getLisbonDateKey, resolveDateChoice, type DateChoice, type TimeMode } from "./lib/service-time";
import type { ConnectionState, Stop, VehicleLocation } from "./lib/types";

export default function App() {
  const [selectedRouteId, setSelectedRouteId] = useState<string>();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation>();
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [originStop, setOriginStop] = useState<Stop>();
  const [destinationStop, setDestinationStop] = useState<Stop>();
  const [selectedJourney, setSelectedJourney] = useState<JourneyOption>();
  const [focusedRouteId, setFocusedRouteId] = useState<string>();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [hoveredStop, setHoveredStop] = useState<Stop>();
  const [clockNow, setClockNow] = useState(() => new Date());
  const [dateChoice, setDateChoice] = useState<DateChoice>({ kind: "today" });
  const [timeMode, setTimeMode] = useState<TimeMode>("now");
  const [manualTime, setManualTime] = useState("09:00");
  const [fullDay, setFullDay] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrips>(() => { try { return parseSavedTrips(window.localStorage.getItem(SAVED_TRIPS_KEY)); } catch { return { favorites: [], recent: [] }; } });
  const [shareMessage, setShareMessage] = useState("");
  const [sharedTripError, setSharedTripError] = useState("");
  const [panelWidth, setPanelWidth] = useState(() => { try { const value = Number(localStorage.getItem("urbanos:panel-width")); return Number.isFinite(value) && value >= 320 ? value : 360; } catch { return 360; } });
  const [draggingPanel, setDraggingPanel] = useState(false);
  const [mobilePanelHeight, setMobilePanelHeight] = useState(() => Math.min(680, Math.round(window.innerHeight * 0.65)));
  const [draggingMobilePanel, setDraggingMobilePanel] = useState(false);
  const mobileDrag = useRef({ y: 0, height: 88, pointerId: -1 });
  const mobileBounds = () => ({ min: 88, max: Math.min(680, Math.round((window.visualViewport?.height ?? window.innerHeight) * 0.82)) });
  const panelBounds = () => ({ min: 320, max: Math.max(320, Math.min(520, window.innerWidth - 400)) });
  const restoredShare = useRef(false);
  const lastRecentKey = useRef("");
  const todayKey = getLisbonDateKey(clockNow);
  const serviceDay = resolveDateChoice(dateChoice, clockNow);
  const routes = useRoutes();
  const sharedTripQuery = parseSharedTrip(window.location.search);
  const stops = useStops(plannerOpen || Boolean(sharedTripQuery));
  const originRoutes = useStopRoutes(originStop?.id);
  const destinationRoutes = useStopRoutes(destinationStop?.id);
  const journeyOptions = useJourneyOptions(originStop?.id, destinationStop?.id, originRoutes.data, destinationRoutes.data, serviceDay);
  const routeDetail = useRouteDetail(focusedRouteId ?? selectedRouteId);
  const locations = useVehicleLocations(plannerOpen ? undefined : selectedRouteId, true);
  const summaries = useVehicleSummaries(locations.data ?? [], locations.pageVisible && !locations.isError);
  const journeyVehicles = useJourneyVehicles(
    (locations.data ?? []).map((vehicle) => ({ ...vehicle, routeId: vehicle.routeId ?? summaries.data?.[vehicle.id]?.routeId, route: vehicle.route ?? summaries.data?.[vehicle.id]?.route })),
    selectedJourney?.leg.routeId ?? selectedJourney?.leg.route.id,
    selectedJourney?.leg.journeyId,
    plannerOpen && Boolean(selectedJourney),
  );
  const selectedRoute = routes.data?.find((route) => route.id === selectedRouteId);
  const vehicles = useMemo(() => (locations.data ?? []).map((vehicle) => {
    const summary = summaries.data?.[vehicle.id];
    const routeId = vehicle.routeId ?? summary?.routeId;
    const route = vehicle.route ?? summary?.route ?? routes.data?.find((item) => item.id === routeId);
    return { ...vehicle, routeId, route, color: vehicle.color || route?.color, directionLabel: summary?.journey?.direction };
  }), [locations.data, routes.data, summaries.data]);
  const mapVehicles = plannerOpen ? (selectedJourney ? journeyVehicles.data : []) : vehicles;
  // O relógio filtra apenas a lista; o percurso desenhado mantém-se estável para
  // que uma atualização temporal não altere o enquadramento do mapa.
  const previewJourney = selectedJourney ?? getSingleRoutePreview(journeyOptions.data?.options, plannerOpen);

  useEffect(() => {
    let timer: number | undefined;
    const clearTimer = () => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; };
    const schedule = () => {
      clearTimer();
      if (document.visibilityState === "visible") timer = window.setTimeout(() => { setClockNow(new Date()); schedule(); }, 30_000);
    };
    const updateVisibility = () => {
      if (document.visibilityState === "visible") setClockNow(new Date());
      schedule();
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => { clearTimer(); document.removeEventListener("visibilitychange", updateVisibility); };
  }, []);

  useEffect(() => {
    setSelectedVehicle(undefined);
    if (!selectedJourney) setFocusedRouteId(selectedRouteId);
  }, [selectedRouteId, selectedJourney]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const latestVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicle.id);
    if (!latestVehicle) setSelectedVehicle(undefined);
    else if (latestVehicle !== selectedVehicle) setSelectedVehicle(latestVehicle);
  }, [vehicles, selectedVehicle]);

  useEffect(() => {
    setSelectedJourney(undefined);
  }, [serviceDay]);

  const connectionState = getConnectionState(locations.isPending, locations.isError, vehicles.length, locations.isStale);
  const visibleTitle = selectedRoute ? selectedRoute.name : "Todas as linhas";
  const routeDetailError = routeDetail.isError ? "Não foi possível carregar o percurso desta linha." : undefined;

  const selectVehicle = (vehicle: VehicleLocation) => { setSelectedVehicle(vehicle); setPanelCollapsed(false); setMobilePanelOpen(true); };
  const openPlanner = () => { setPlannerOpen(true); setSelectedVehicle(undefined); setPanelCollapsed(false); setMobilePanelOpen(true); };
  const selectPlannerStop = (stop: Stop, field: "origin" | "destination") => {
    if (field === "origin") setOriginStop(stop); else setDestinationStop(stop);
    setSelectedJourney(undefined);
    setPlannerOpen(true);
    setPanelCollapsed(false);
  };
  const selectJourney = (option: JourneyOption) => { setSelectedJourney(option); setFocusedRouteId(option.leg.route.id); };
  const closeItinerary = () => { setSelectedJourney(undefined); setFocusedRouteId(selectedRouteId); };
  const changeDate = (choice: DateChoice) => {
    setDateChoice(choice);
    setSelectedJourney(undefined);
    if (choice.kind === "today") setTimeMode("now");
    else { setTimeMode("manual"); setManualTime("00:00"); }
  };
  const viewTomorrow = () => changeDate({ kind: "tomorrow" });
  const selectSavedTrip = (trip: SavedTrip) => {
    const resolved = resolveTripStops(trip, stops.data ?? []);
    if (!resolved.origin || !resolved.destination) return;
    const key = tripKey(trip); lastRecentKey.current = key; setSavedTrips((current) => addRecentTrip(current, trip));
    setOriginStop(resolved.origin); setDestinationStop(resolved.destination); setSelectedJourney(undefined);
    setHoveredStop(undefined); setShareMessage(""); setSharedTripError(""); setClockNow(new Date());
    setDateChoice({ kind: "today" }); setTimeMode("now"); setFullDay(false);
    setPlannerOpen(true); setPanelCollapsed(false); setMobilePanelOpen(true);
  };

  useEffect(() => { try { window.localStorage.setItem(SAVED_TRIPS_KEY, serializeSavedTrips(savedTrips)); } catch { /* browser storage can be unavailable */ } }, [savedTrips]);
  useEffect(() => {
    const resize = () => { if (window.innerWidth > 1023) setPanelWidth((width) => Math.min(panelBounds().max, Math.max(panelBounds().min, width))); };
    window.addEventListener("resize", resize); resize();
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => { try { localStorage.setItem("urbanos:panel-width", String(panelWidth)); } catch { /* browser storage can be unavailable */ } }, [panelWidth]);
  useEffect(() => {
    if (!draggingPanel) return;
    const move = (event: PointerEvent) => { const bounds = panelBounds(); setPanelWidth(Math.min(bounds.max, Math.max(bounds.min, event.clientX))); };
    const end = () => setDraggingPanel(false);
    document.body.classList.add("resizing-panel"); window.addEventListener("pointermove", move); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
    return () => { document.body.classList.remove("resizing-panel"); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); };
  }, [draggingPanel]);
  useEffect(() => {
    const resize = () => setMobilePanelHeight((height) => Math.max(mobileBounds().min, Math.min(mobileBounds().max, height)));
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize); };
  }, []);
  const resizeMobilePanel = (height: number) => {
    const bounds = mobileBounds();
    setMobilePanelHeight(Math.max(bounds.min, Math.min(bounds.max, height)));
    setMobilePanelOpen(true); setPanelCollapsed(false);
  };
  useEffect(() => {
    const parsed = sharedTripQuery;
    if (restoredShare.current) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("from") && !params.has("to")) return;
    if (!parsed) {
      restoredShare.current = true;
      openPlanner();
      setSharedTripError("A ligação da viagem é inválida. Escolha a partida e o destino.");
      return;
    }
    if (stops.isPending || stops.isError) return;
    restoredShare.current = true;
    const resolved = resolveTripStops({ ...parsed }, stops.data ?? []);
    if (resolved.origin && resolved.destination) selectSavedTrip({ ...parsed });
    else {
      openPlanner(); setOriginStop(resolved.origin); setDestinationStop(resolved.destination);
      setSharedTripError("Uma paragem da viagem partilhada já não existe. Escolha uma paragem para a substituir.");
    }
  }, [sharedTripQuery?.originId, sharedTripQuery?.destinationId, stops.data, stops.isPending, stops.isError]);
  useEffect(() => {
    if (!originStop || !destinationStop || originStop.id === destinationStop.id) { lastRecentKey.current = ""; return; }
    if (!journeyOptions.data || journeyOptions.isPending || journeyOptions.isError) return;
    const trip = { originId: originStop.id, destinationId: destinationStop.id };
    const key = tripKey(trip);
    if (lastRecentKey.current !== key) { lastRecentKey.current = key; setSavedTrips((current) => addRecentTrip(current, trip)); }
  }, [originStop?.id, destinationStop?.id, journeyOptions.data, journeyOptions.isPending, journeyOptions.isError]);

  useEffect(() => { setShareMessage(""); }, [originStop?.id, destinationStop?.id]);

  const shareTrip = async () => {
    if (!originStop || !destinationStop || originStop.id === destinationStop.id) return;
    const url = createShareUrl(originStop.id, destinationStop.id);
    try {
      if (navigator.share) { await navigator.share({ title: "Viagem nos Urbanos de Vila Real", url }); setShareMessage("Ligação partilhada."); return; }
      await navigator.clipboard.writeText(url); setShareMessage("Ligação copiada.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try { await navigator.clipboard.writeText(url); setShareMessage("Ligação copiada."); }
      catch { setShareMessage("Não foi possível partilhar nem copiar a ligação."); }
    }
  };

  return (
    <main className={`app-shell ${panelCollapsed ? "panel-is-collapsed" : ""} ${draggingMobilePanel ? "mobile-panel-is-dragging" : ""}`} style={{ "--panel-width": `${panelWidth}px`, "--mobile-panel-height": `${mobilePanelHeight}px`, "--mobile-visible-height": `${!panelCollapsed && mobilePanelOpen ? mobilePanelHeight : 88}px` } as CSSProperties}>
      <TransitMap vehicles={mapVehicles} positionsUpdatedAt={locations.dataUpdatedAt} routeDetail={routeDetail.data} selectedJourney={previewJourney} stops={stops.data ?? []} plannerMode={plannerOpen} selectedOrigin={originStop} selectedDestination={destinationStop} hoveredStop={hoveredStop} selectedVehicleId={selectedVehicle?.id} onSelectVehicle={selectVehicle} onSelectStop={selectPlannerStop} />
      <aside id="control-panel" className={`control-panel ${mobilePanelOpen ? "mobile-open" : ""}`} aria-label="Controlo do mapa">
        <button className="panel-grabber" type="button" role="separator" aria-label="Redimensionar altura do painel" aria-orientation="horizontal" aria-controls="control-panel" aria-valuemin={mobileBounds().min} aria-valuemax={mobileBounds().max} aria-valuenow={mobilePanelOpen ? mobilePanelHeight : 88}
          onPointerDown={(event) => {
            if (event.button !== 0 || window.innerWidth > 1023) return;
            event.preventDefault();
            const height = event.currentTarget.closest("aside")!.getBoundingClientRect().height;
            mobileDrag.current = { y: event.clientY, height, pointerId: event.pointerId };
            event.currentTarget.setPointerCapture(event.pointerId);
            setDraggingMobilePanel(true);
            resizeMobilePanel(height);
          }}
          onPointerMove={(event) => { if (mobileDrag.current.pointerId === event.pointerId) resizeMobilePanel(mobileDrag.current.height + mobileDrag.current.y - event.clientY); }}
          onPointerUp={(event) => {
            if (mobileDrag.current.pointerId !== event.pointerId) return;
            mobileDrag.current.pointerId = -1; setDraggingMobilePanel(false);
            if (mobilePanelHeight < 160) { setMobilePanelOpen(false); setMobilePanelHeight(Math.min(mobileBounds().max, Math.round(window.innerHeight * 0.65))); }
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onLostPointerCapture={() => { mobileDrag.current.pointerId = -1; setDraggingMobilePanel(false); }}
          onPointerCancel={() => { mobileDrag.current.pointerId = -1; setDraggingMobilePanel(false); }}
          onKeyDown={(event) => {
            const height = mobilePanelOpen ? mobilePanelHeight : 88;
            if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); resizeMobilePanel(height + (event.key === "ArrowUp" ? 32 : -32)); }
            else if (event.key === "End") { event.preventDefault(); resizeMobilePanel(mobileBounds().max); }
            else if (event.key === "Home") { event.preventDefault(); setMobilePanelOpen(false); }
          }} />
        <header className="app-header">
          <div className="brand-mark" aria-hidden="true">U</div>
          <div><h1>Urbanos</h1></div>
          <button className="icon-button panel-close" onClick={() => { setPanelCollapsed(true); setMobilePanelOpen(false); }} aria-label="Recolher painel">×</button>
        </header>
        <div className="panel-content">
          <div className="mode-switch" role="tablist" aria-label="Modo da aplicação">
          <button className={!plannerOpen ? "is-active" : ""} role="tab" aria-selected={!plannerOpen} onClick={() => { setHoveredStop(undefined); setPlannerOpen(false); setFocusedRouteId(selectedRouteId); }}>Mapa ao vivo</button>
          <button className={plannerOpen ? "is-active" : ""} role="tab" aria-selected={plannerOpen} onClick={openPlanner}>Planear viagem</button>
          </div>
          {!plannerOpen ? <RouteSelector routes={routes.data ?? []} selectedRouteId={selectedRouteId} onChange={setSelectedRouteId} disabled={routes.isPending || routes.isError} /> : null}
          {routes.isError ? <p className="error-copy">Não foi possível carregar as linhas. Verifique a configuração da API.</p> : null}
          {plannerOpen && sharedTripError ? <p role="status" className="error-copy">{sharedTripError}</p> : null}
          {!plannerOpen ? <>
            <div className="panel-section-heading"><div><p className="eyebrow">Em circulação</p><h2>{visibleTitle}</h2></div><span className="count-pill">{vehicles.length}</span></div>
            <ConnectionStatus state={connectionState} lastUpdatedAt={locations.dataUpdatedAt || undefined} error={locations.error as Error | null} onReconnect={locations.reconnect} reconnecting={locations.isFetching} />
            {selectedRouteId && routeDetail.isPending ? <p className="muted">A carregar percurso e paragens…</p> : null}
            {routeDetailError ? <p className="error-copy">{routeDetailError}</p> : null}
            {selectedVehicle ? <VehicleDetails vehicle={selectedVehicle} onClose={() => setSelectedVehicle(undefined)} /> : <VehicleList vehicles={vehicles} selectedId={undefined} onSelect={selectVehicle} />}
          </> : stops.isError ? <div className="planner-message"><strong>Não foi possível carregar o catálogo de paragens.</strong><span>A pesquisa não está disponível sem esse catálogo.</span><button className="button button-small" onClick={() => void stops.refetch()}>Tentar novamente</button></div> : <JourneyPlanner stops={stops.data ?? []} origin={originStop} destination={destinationStop} onOriginChange={(stop) => { setOriginStop(stop); setSelectedJourney(undefined); }} onDestinationChange={(stop) => { setDestinationStop(stop); setSelectedJourney(undefined); }} onSwap={() => { setOriginStop(destinationStop); setDestinationStop(originStop); setSelectedJourney(undefined); }} originRoutes={originRoutes} destinationRoutes={destinationRoutes} options={journeyOptions} selected={selectedJourney} onHoverStop={setHoveredStop} onSelect={selectJourney} onCloseItinerary={closeItinerary} dateChoice={dateChoice} serviceDay={serviceDay} todayKey={todayKey} now={clockNow} timeMode={timeMode} manualTime={manualTime} fullDay={fullDay} onDateChange={changeDate} onTimeModeChange={setTimeMode} onManualTimeChange={(value) => { setManualTime(value); setTimeMode("manual"); }} onFullDayChange={setFullDay} onViewTomorrow={viewTomorrow} savedTrips={<SavedTripsShelf favorites={savedTrips.favorites} recent={savedTrips.recent} stops={stops.data ?? []} onSelect={selectSavedTrip} onToggleFavorite={(trip) => setSavedTrips((current) => toggleFavorite(current, trip))} onRemoveRecent={(trip) => setSavedTrips((current) => ({ ...current, recent: current.recent.filter((entry) => tripKey(entry) !== tripKey(trip)) }))} onClearRecent={() => setSavedTrips((current) => ({ ...current, recent: [] }))} onRenameFavorite={(trip, name) => setSavedTrips((current) => ({ ...current, favorites: current.favorites.map((entry) => tripKey(entry) === tripKey(trip) ? { ...entry, name } : entry) }))} onReplaceMissing={(trip, replacement) => setSavedTrips((current) => { if (replacement.originId === replacement.destinationId) return current; const wasFavorite = current.favorites.some((entry) => tripKey(entry) === tripKey(trip)); const wasRecent = current.recent.some((entry) => tripKey(entry) === tripKey(trip)); let next = { ...current, favorites: current.favorites.filter((entry) => tripKey(entry) !== tripKey(trip)), recent: current.recent.filter((entry) => tripKey(entry) !== tripKey(trip)) }; if (wasFavorite) next = toggleFavorite(next, { ...replacement, name: trip.name }); if (wasRecent) next = addRecentTrip(next, replacement); return next; })} />} onShare={shareTrip} shareMessage={shareMessage} />}
        </div>
        <footer className="panel-footer"><details><summary>Sobre os dados</summary><p>Integração não oficial. Os dados são fornecidos por uma API cuja licença de redistribuição não está confirmada e podem estar incompletos ou desatualizados. As posições são atualizadas enquanto a página está visível.</p></details></footer>
      </aside>
      <button className="panel-resizer" type="button" role="separator" aria-label="Redimensionar painel lateral" aria-orientation="vertical" aria-controls="control-panel" aria-valuemin={panelBounds().min} aria-valuemax={panelBounds().max} aria-valuenow={Math.max(panelBounds().min, Math.min(panelBounds().max, panelWidth))} onPointerDown={() => { if (window.innerWidth > 1023) setDraggingPanel(true); }} onKeyDown={(event) => { const bounds = panelBounds(); if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setPanelWidth((value) => Math.max(bounds.min, Math.min(bounds.max, value + (event.key === "ArrowRight" ? 16 : -16)))); } else if (event.key === "Home") setPanelWidth(bounds.min); else if (event.key === "End") setPanelWidth(bounds.max); }} />
      <button className="desktop-panel-reopen" hidden={!panelCollapsed} onClick={() => { setPanelCollapsed(false); setMobilePanelOpen(true); }}>Mostrar painel</button>
      <button className="mobile-panel-toggle" onClick={() => { if (panelCollapsed) setPanelCollapsed(false); setMobilePanelOpen((open) => !open); }} aria-expanded={!panelCollapsed && mobilePanelOpen}>{panelCollapsed ? "Mostrar painel" : plannerOpen ? "Planear viagem" : "Linhas e veículos"} <span>{panelCollapsed ? "↗" : plannerOpen ? "↗" : vehicles.length}</span></button>
    </main>
  );
}

function getSingleRoutePreview(options: JourneyOption[] | undefined, plannerOpen: boolean): JourneyOption | undefined {
  if (!plannerOpen || !options?.length) return undefined;
  const routeIds = new Set(options.map((option) => option.leg.routeId ?? option.leg.route.id));
  return routeIds.size === 1 ? options[0] : undefined;
}

function getConnectionState(loading: boolean, error: boolean, count: number, stale: boolean): ConnectionState {
  if (loading && !count) return "loading";
  if (error) return count ? "stale" : "error";
  if (stale) return "stale";
  return count ? "success" : "empty";
}
