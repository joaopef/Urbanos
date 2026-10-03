import { useVehicleDetail } from "../hooks/use-vehicle-detail";
import type { VehicleDetail, VehicleLocation } from "../lib/types";
import { selectUpcomingStops } from "../lib/vehicle";

interface Props { vehicle: VehicleLocation; onClose: () => void; }

export function VehicleDetails({ vehicle, onClose }: Props) {
  const detail = useVehicleDetail(vehicle.id);
  const route = detail.data?.route ?? vehicle.route;
  return <section className="detail-card" aria-labelledby="vehicle-detail-title">
    <div className="detail-heading"><div><p className="eyebrow">Autocarro</p><h2 id="vehicle-detail-title">{route?.id === "9" ? "Linha noturna" : route?.nameShort ? `Linha ${route.nameShort}` : route?.name || "Linha por identificar"}</h2>{detail.dataUpdatedAt ? <span className="detail-updated">Última consulta: {formatTime(detail.dataUpdatedAt)}</span> : null}</div><button className="icon-button" onClick={onClose} aria-label="Fechar detalhe">×</button></div>
    {detail.isPending ? <p className="muted">A carregar detalhe…</p> : null}
    {detail.isError ? <div className="detail-error"><p className="error-copy">Não foi possível atualizar o detalhe desta circulação.</p><button className="button button-small" onClick={() => void detail.refetch()} disabled={detail.isFetching}>Tentar novamente</button></div> : null}
    {detail.data ? <DetailContent data={detail.data} /> : <Summary vehicle={vehicle} />}
  </section>;
}

function Summary({ vehicle }: { vehicle: VehicleLocation }) {
  return <><p className="muted">{vehicle.status || "Detalhe de destino e paragens indisponível."}</p><details className="technical-details"><summary>Mais detalhes</summary><dl className="detail-grid"><DetailField label="ID interno" value={vehicle.id} /><DetailField label="ID da rota" value={vehicle.routeId} /><DetailField label="Velocidade" value={vehicle.speed === undefined ? undefined : `${vehicle.speed} km/h`} /><DetailField label="Atraso indicado" value={vehicle.delay === undefined ? undefined : `${vehicle.delay} min`} /></dl></details></>;
}

function DetailContent({ data }: { data: VehicleDetail }) {
  const nextStops = selectUpcomingStops(data.stops, data.currentStopSequence);
  return <>
    <p className="detail-destination">{data.journey?.direction || "Sentido não indicado"}</p>
    <div className="next-stops"><h3>Próximas paragens</h3>{nextStops.length ? <ol>{nextStops.map((stop) => <li key={`${stop.id}-${stop.sequence ?? "unknown"}`}><span>{stop.name}</span><small>{stop.dueInMinutes !== undefined ? stop.dueInMinutes === 0 ? "Agora" : `Tempo real · em ${stop.dueInMinutes} min` : stop.arrivalTime || stop.departureTime ? `Programado · ${stop.arrivalTime || stop.departureTime}` : "Horário não disponível"}</small></li>)}</ol> : <p className="muted">Próximas paragens não disponíveis.</p>}</div>
    <p className="schedule-note">Horários podem ser programados. Os tempos em tempo real só aparecem quando fornecidos.</p>
    <details className="technical-details"><summary>Mais detalhes</summary><dl className="detail-grid"><DetailField label="ID do veículo" value={data.id} /><DetailField label="ID da rota" value={data.routeId} /><DetailField label="Circulação" value={data.journey?.id || data.journeyId} /><DetailField label="Estado" value={data.status || data.busStatus} /><DetailField label="Velocidade" value={data.speed === undefined ? undefined : `${data.speed} km/h`} /><DetailField label="Atraso indicado" value={data.delay === undefined ? undefined : `${data.delay} min`} /><DetailField label="Dados de origem" value={data.sourceUpdatedAt} /><DetailField label="Matrícula" value={data.licensePlate} /><DetailField label="Frota" value={data.fleetId} /></dl></details>
  </>;
}

function DetailField({ label, value }: { label: string; value?: string | number }) { if (value === undefined || value === null || value === "") return null; return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function formatTime(value: number) { return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(value); }
