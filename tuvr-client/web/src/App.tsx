import { useEffect, useMemo, useState } from "react";
import { useRouteDetail } from "./hooks/use-route-detail";
import { useRoutes } from "./hooks/use-routes";
import { useVehicleLocations } from "./hooks/use-vehicle-locations";
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
  const todayKey = getLisbonDateKey(clockNow);
  const serviceDay = resolveDateChoice(dateChoice, clockNow);
  const routes = useRoutes();
  const stops = useStops(plannerOpen);
  const originRoutes = useStopRoutes(originStop?.id);
  const destinationRoutes = useStopRoutes(destinationStop?.id);
  const journeyOptions = useJourneyOptions(originStop?.id, destinationStop?.id, originRoutes.data, destinationRoutes.data, serviceDay);
  const routeDetail = useRouteDetail(focusedRouteId ?? selectedRouteId);
  const locations = useVehicleLocations(plannerOpen ? undefined : selectedRouteId, true);
  const journeyVehicles = useJourneyVehicles(
    locations.data ?? [],
    selectedJourney?.leg.routeId ?? selectedJourney?.leg.route.id,
    selectedJourney?.leg.journeyId,
    plannerOpen && Boolean(selectedJourney),
  );
  const selectedRoute = routes.data?.find((route) => route.id === selectedRouteId);
  const vehicles = useMemo(() => (locations.data ?? []).map((vehicle) => {
    if (vehicle.route || vehicle.routeId || !selectedRouteId) return vehicle;
    return { ...vehicle, routeId: selectedRouteId, route: selectedRoute };
  }), [locations.data, selectedRouteId, selectedRoute]);
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
    setMobilePanelOpen(false);
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

  return (
    <main className={`app-shell ${panelCollapsed ? "panel-is-collapsed" : ""}`}>
      <TransitMap vehicles={mapVehicles} routeDetail={routeDetail.data} selectedJourney={previewJourney} stops={stops.data ?? []} plannerMode={plannerOpen} selectedOrigin={originStop} selectedDestination={destinationStop} hoveredStop={hoveredStop} selectedVehicleId={selectedVehicle?.id} onSelectVehicle={selectVehicle} onSelectStop={selectPlannerStop} />
      <aside className={`control-panel ${mobilePanelOpen ? "mobile-open" : ""}`} aria-label="Controlo do mapa">
        <div className="panel-grabber" aria-hidden="true" />
        <header className="app-header">
          <div className="brand-mark" aria-hidden="true">U</div>
          <div><p className="eyebrow">Transportes urbanos</p><h1>Vila Real</h1></div>
          <button className="icon-button panel-close" onClick={() => { setPanelCollapsed(true); setMobilePanelOpen(false); }} aria-label="Recolher painel">×</button>
        </header>
        <p className="intro">Consulte as linhas, posições e ligações disponíveis.</p>
        <div className="panel-content">
          <div className="mode-switch" role="tablist" aria-label="Modo da aplicação">
          <button className={!plannerOpen ? "is-active" : ""} role="tab" aria-selected={!plannerOpen} onClick={() => { setHoveredStop(undefined); setPlannerOpen(false); setFocusedRouteId(selectedRouteId); }}>Mapa ao vivo</button>
          <button className={plannerOpen ? "is-active" : ""} role="tab" aria-selected={plannerOpen} onClick={openPlanner}>Planear viagem</button>
          </div>
          <RouteSelector routes={routes.data ?? []} selectedRouteId={selectedRouteId} onChange={setSelectedRouteId} disabled={routes.isPending || routes.isError} />
          {routes.isError ? <p className="error-copy">Não foi possível carregar as linhas. Verifique a configuração da API.</p> : null}
          {!plannerOpen ? <>
            <div className="panel-section-heading"><div><p className="eyebrow">Em circulação</p><h2>{visibleTitle}</h2></div><span className="count-pill">{vehicles.length}</span></div>
            <ConnectionStatus state={connectionState} lastUpdatedAt={locations.dataUpdatedAt || undefined} error={locations.error as Error | null} onReconnect={locations.reconnect} reconnecting={locations.isFetching} />
            {selectedRouteId && routeDetail.isPending ? <p className="muted">A carregar percurso e paragens…</p> : null}
            {routeDetailError ? <p className="error-copy">{routeDetailError}</p> : null}
            {selectedVehicle ? <VehicleDetails vehicle={selectedVehicle} onClose={() => setSelectedVehicle(undefined)} /> : <VehicleList vehicles={vehicles} selectedId={undefined} onSelect={selectVehicle} />}
          </> : stops.isError ? <div className="planner-message"><strong>Não foi possível carregar o catálogo de paragens.</strong><span>A pesquisa não está disponível sem esse catálogo.</span><button className="button button-small" onClick={() => void stops.refetch()}>Tentar novamente</button></div> : <JourneyPlanner stops={stops.data ?? []} origin={originStop} destination={destinationStop} onOriginChange={(stop) => { setOriginStop(stop); setSelectedJourney(undefined); }} onDestinationChange={(stop) => { setDestinationStop(stop); setSelectedJourney(undefined); }} onSwap={() => { setOriginStop(destinationStop); setDestinationStop(originStop); setSelectedJourney(undefined); }} originRoutes={originRoutes} destinationRoutes={destinationRoutes} options={journeyOptions} selected={selectedJourney} onHoverStop={setHoveredStop} onSelect={selectJourney} onCloseItinerary={closeItinerary} dateChoice={dateChoice} serviceDay={serviceDay} todayKey={todayKey} now={clockNow} timeMode={timeMode} manualTime={manualTime} fullDay={fullDay} onDateChange={changeDate} onTimeModeChange={setTimeMode} onManualTimeChange={(value) => { setManualTime(value); setTimeMode("manual"); }} onFullDayChange={setFullDay} onViewTomorrow={viewTomorrow} />}
        </div>
        <footer className="panel-footer"><p><strong>Integração não oficial.</strong> Dados fornecidos por uma API sem licença de redistribuição confirmada.</p><p>As posições são atualizadas no máximo a cada 5 segundos enquanto esta página está visível.</p></footer>
      </aside>
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
