import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import type { JourneyOption } from "../lib/planner/types";
import type { RouteDetail, Stop, VehicleLocation } from "../lib/types";

const VILA_REAL: [number, number] = [41.3006, -7.7441];
// Carto Positron was checked as a possible cleaner alternative, but its tiles
// currently render an API KEY REQUIRED watermark. Keep the known working,
// no-key fallback and allow deployments to configure another provider.
const DEFAULT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";
const VEHICLE_ANIMATION_MS = 4_800;

interface Props {
  vehicles: VehicleLocation[];
  routeDetail?: RouteDetail;
  selectedJourney?: JourneyOption;
  stops: Stop[];
  plannerMode: boolean;
  selectedOrigin?: Stop;
  selectedDestination?: Stop;
  hoveredStop?: Stop;
  selectedVehicleId?: string;
  onSelectVehicle: (vehicle: VehicleLocation) => void;
  onSelectStop: (stop: Stop, field: "origin" | "destination") => void;
}

export function TransitMap({ vehicles, routeDetail, selectedJourney, stops, plannerMode, selectedOrigin, selectedDestination, hoveredStop, selectedVehicleId, onSelectVehicle, onSelectStop }: Props) {
  const mapShellRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={mapShellRef} className="map-shell" aria-label="Mapa de transportes de Vila Real">
      <MapContainer center={VILA_REAL} zoom={14} minZoom={11} className="map" zoomControl={false} keyboard>
        <TileLayer url={import.meta.env.VITE_TILE_URL || DEFAULT_TILE_URL} attribution={import.meta.env.VITE_TILE_ATTRIBUTION || DEFAULT_TILE_ATTRIBUTION} />
        <MapResizeObserver containerRef={mapShellRef} />
        <MapActions routeDetail={routeDetail} selectedJourney={selectedJourney} />
        <ZoomControl position="topright" />
        {plannerMode && selectedJourney ? <JourneyLayer option={selectedJourney} /> : !plannerMode && routeDetail ? <RouteLayer detail={routeDetail} /> : null}
        {plannerMode ? <StopCatalog stops={stops} onSelect={onSelectStop} /> : null}
        {plannerMode && hoveredStop?.position ? <HoveredStopPreview stop={hoveredStop} /> : null}
        {selectedOrigin?.position ? <Marker position={[selectedOrigin.position.lat, selectedOrigin.position.lon]} icon={selectedStopIcon("P", "#16845a")}><Popup>Partida: {selectedOrigin.name}</Popup></Marker> : null}
        {selectedDestination?.position ? <Marker position={[selectedDestination.position.lat, selectedDestination.position.lon]} icon={selectedStopIcon("D", "#bc3c39")}><Popup>Destino: {selectedDestination.name}</Popup></Marker> : null}
        {vehicles.filter((vehicle) => vehicle.position).map((vehicle) => <AnimatedVehicleMarker key={vehicle.id} vehicle={vehicle} selected={vehicle.id === selectedVehicleId} onSelect={onSelectVehicle} />)}
      </MapContainer>
      <div className="map-note">Mapa base e dados de transporte sujeitos às respetivas condições de utilização.</div>
    </div>
  );
}

function HoveredStopPreview({ stop }: { stop: Stop }) {
  const position: [number, number] = [stop.position!.lat, stop.position!.lon];

  return (
    <Marker position={position} icon={selectedStopIcon("?", "#7c3aed")} zIndexOffset={1000}>
      <Tooltip permanent direction="top" offset={[0, -12]}>
        <span className="hover-stop-tooltip"><strong>{stop.name}</strong><small>Código {stop.id}</small></span>
      </Tooltip>
    </Marker>
  );
}

function MapResizeObserver({ containerRef }: { containerRef: RefObject<HTMLDivElement | null> }) {
  const map = useMap();
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const invalidate = () => map.invalidateSize({ animate: false, pan: false });
    invalidate();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, map]);
  return null;
}

function MapActions({ routeDetail, selectedJourney }: { routeDetail?: RouteDetail; selectedJourney?: JourneyOption }) {
  const map = useMap();
  const controlRef = useRef<HTMLDivElement>(null);
  const bounds = useMemo(() => selectedJourney ? getJourneyBounds(selectedJourney) : routeDetail ? getRouteBounds(routeDetail) : null, [routeDetail, selectedJourney]);

  useEffect(() => {
    if (controlRef.current) L.DomEvent.disableClickPropagation(controlRef.current);
  }, []);

  const fitSelected = () => {
    if (bounds?.isValid()) map.fitBounds(bounds.pad(0.12), { animate: false });
  };

  return (
    <div ref={controlRef} className="map-actions leaflet-control" aria-label="Ações do mapa">
      <button type="button" onClick={fitSelected} disabled={!bounds?.isValid()}>Ver percurso</button>
      <button type="button" onClick={() => map.setView(VILA_REAL, 14, { animate: false })}>Vila Real</button>
    </div>
  );
}

function JourneyLayer({ option }: { option: JourneyOption }) {
  const map = useMap();
  const occurrences = useMemo(() => [option.leg.boarding, ...option.leg.intermediateStops, option.leg.alighting], [option]);
  const stopPositions = useMemo(() => getStopPositions(occurrences), [occurrences]);
  const path = useMemo(() => option.leg.shape?.length ? option.leg.shape : stopPositions, [option, stopPositions]);
  const viewKey = `${option.id}:${option.leg.routeId ?? option.leg.route.id}:${option.leg.journeyId ?? ""}:${geometryKey(path)}`;
  useEffect(() => {
    const bounds = getJourneyBounds(option);
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { animate: false });
  }, [map, viewKey]);

  return (
    <>
      {path.length > 1 ? <Polyline positions={path} pathOptions={{ color: option.leg.route.color || "#146ef5", weight: 7, opacity: 0.95 }} /> : null}
      {occurrences.filter((occurrence) => occurrence.stop.position).map((occurrence) => <Marker key={`${occurrence.stop.id}-${occurrence.order}`} position={[occurrence.stop.position!.lat, occurrence.stop.position!.lon]} icon={occurrence.order === option.leg.boarding.order ? selectedStopIcon("P", "#16845a") : occurrence.order === option.leg.alighting.order ? selectedStopIcon("D", "#bc3c39") : stopIcon}><Popup><strong>{occurrence.stop.name}</strong><br />Linha {option.leg.route.nameShort || option.leg.route.name}</Popup></Marker>)}
    </>
  );
}

function StopCatalog({ stops, onSelect }: { stops: Stop[]; onSelect: (stop: Stop, field: "origin" | "destination") => void }) {
  return <>{stops.filter((stop) => stop.position).map((stop) => <Marker key={`catalog-${stop.id}`} position={[stop.position!.lat, stop.position!.lon]} icon={stopIcon}><Popup><div className="stop-popup"><strong>{stop.name}</strong><small>Código {stop.id}</small><div><button type="button" onClick={() => onSelect(stop, "origin")}>Partir daqui</button><button type="button" onClick={() => onSelect(stop, "destination")}>Chegar aqui</button></div></div></Popup></Marker>)}</>;
}

function RouteLayer({ detail }: { detail: RouteDetail }) {
  const map = useMap();
  const viewKey = `${detail.route.id}:${geometryKey(detail.shape)}:${detail.stops.length}`;
  useEffect(() => {
    const bounds = getRouteBounds(detail);
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { animate: false });
  }, [map, viewKey]);

  return (
    <>
      {detail.shape.length ? <Polyline positions={detail.shape} pathOptions={{ color: detail.route.color || "#146ef5", weight: 5, opacity: 0.85 }} /> : null}
      {detail.stops.filter((stop) => stop.position).map((stop) => <Marker key={stop.id} position={[stop.position!.lat, stop.position!.lon]} icon={stopIcon}><Popup><strong>{stop.name}</strong></Popup></Marker>)}
    </>
  );
}

function getJourneyBounds(option: JourneyOption) {
  const occurrences = [option.leg.boarding, ...option.leg.intermediateStops, option.leg.alighting];
  const stopPositions = getStopPositions(occurrences);
  return L.latLngBounds(option.leg.shape?.length ? option.leg.shape : stopPositions);
}

function getRouteBounds(detail: RouteDetail) {
  return L.latLngBounds(detail.shape.length ? detail.shape : getStopPositions(detail.stops));
}

function getStopPositions(stops: Array<{ stop?: Stop; position?: Stop["position"] }> | Stop[]) {
  return stops.flatMap((item) => {
    const stop = "stop" in item ? item.stop : item;
    return stop?.position ? [[stop.position.lat, stop.position.lon] as [number, number]] : [];
  });
}

function geometryKey(points: Array<[number, number]>) {
  if (!points.length) return "empty";
  const first = points[0];
  const last = points[points.length - 1];
  return `${points.length}:${first[0]},${first[1]}:${last[0]},${last[1]}`;
}

function AnimatedVehicleMarker({ vehicle, selected, onSelect }: { vehicle: VehicleLocation; selected: boolean; onSelect: (vehicle: VehicleLocation) => void }) {
  const target: [number, number] = [vehicle.position!.lat, vehicle.position!.lon];
  const displayed = useRef<[number, number]>(target);
  const [position, setPosition] = useState<[number, number]>(target);

  useEffect(() => {
    const start = displayed.current;
    if (start[0] === target[0] && start[1] === target[1]) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      displayed.current = target; setPosition(target); return;
    }
    const startedAt = performance.now();
    let frame = 0;
    const animate = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / VEHICLE_ANIMATION_MS);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const next: [number, number] = [
        start[0] + (target[0] - start[0]) * eased,
        start[1] + (target[1] - start[1]) * eased,
      ];
      displayed.current = next;
      setPosition(next);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target[0], target[1]]);

  return <VehicleMarker vehicle={{ ...vehicle, position: { lat: position[0], lon: position[1] } }} selected={selected} onSelect={onSelect} />;
}

function VehicleMarker({ vehicle, selected, onSelect }: { vehicle: VehicleLocation; selected: boolean; onSelect: (vehicle: VehicleLocation) => void }) {
  const position = vehicle.position!;
  const lineLabel = vehicle.route?.nameShort || vehicle.route?.name;
  const iconLabel = lineLabel ? `Autocarro da linha ${lineLabel}` : "Autocarro sem linha identificada";
  const icon = useMemo(() => L.divIcon({ className: "vehicle-map-icon-wrap", html: `<span class="vehicle-map-marker ${selected ? "is-selected" : ""}" role="img" aria-label="${escapeHtml(iconLabel)}" style="--vehicle-color:${escapeHtml(vehicle.color || vehicle.route?.color || "#536b7b")}"><svg class="vehicle-map-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M8 5h16a3 3 0 0 1 3 3v15a2 2 0 0 1-2 2v2h-3v-2H10v2H7v-2a2 2 0 0 1-2-2V8a3 3 0 0 1 3-3Zm0 3v9h16V8H8Zm1 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>${lineLabel ? `<span class="vehicle-line-label">${escapeHtml(lineLabel)}</span>` : ""}</span>`, iconSize: lineLabel ? [70, 48] : [44, 44], iconAnchor: lineLabel ? [24, 24] : [22, 22] }), [selected, vehicle.color, vehicle.route?.color, lineLabel, iconLabel]);
  return <Marker position={[position.lat, position.lon]} icon={icon} alt={lineLabel ? `Autocarro da linha ${lineLabel}` : "Autocarro sem linha identificada"} eventHandlers={{ click: () => onSelect(vehicle) }}><Popup>{lineLabel ? `Linha ${lineLabel}` : "Linha por identificar"}<br /><button type="button" onClick={() => onSelect(vehicle)}>Ver detalhe</button></Popup></Marker>;
}

const stopIcon = L.divIcon({ className: "stop-icon-wrap", html: '<span class="stop-icon" aria-hidden="true"></span>', iconSize: [24, 28], iconAnchor: [12, 24] });
function selectedStopIcon(label: string, color: string) { return L.divIcon({ className: "selected-stop-icon-wrap", html: `<span class="selected-stop-icon" style="--selected-stop-color:${color}">${label}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char); }
