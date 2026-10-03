import { useVehicleDetail } from "../hooks/use-vehicle-detail";
import type { VehicleLocation } from "../lib/types";
import { selectUpcomingStops } from "../lib/vehicle";

interface Props {
  vehicle: VehicleLocation;
  onClose: () => void;
}

export function VehicleDetails({ vehicle, onClose }: Props) {
  const detail = useVehicleDetail(vehicle.id);
  return (
    <section className="detail-card" aria-labelledby="vehicle-detail-title">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Detalhe do veículo</p>
          <h2 id="vehicle-detail-title">Veículo {vehicle.id}</h2>
          {detail.dataUpdatedAt ? <span className="detail-updated">Consulta atualizada: {formatTime(detail.dataUpdatedAt)}</span> : null}
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Fechar detalhe">×</button>
      </div>
      {detail.isPending ? <p className="muted">A carregar detalhe…</p> : null}
      {detail.isError ? <div className="detail-error"><p className="error-copy">Não foi possível atualizar o detalhe desta circulação.</p><button className="button button-small" onClick={() => void detail.refetch()} disabled={detail.isFetching}>Tentar novamente</button></div> : null}
      {detail.data ? <DetailContent data={detail.data} /> : <Summary vehicle={vehicle} />}
    </section>
  );
}

function Summary({ vehicle }: { vehicle: VehicleLocation }) {
  return <dl className="detail-grid"><DetailField label="Linha" value={vehicle.route?.name || vehicle.routeId} /><DetailField label="Estado" value={vehicle.status} /><DetailField label="Velocidade" value={vehicle.speed === undefined ? undefined : `${vehicle.speed} km/h`} /><DetailField label="Atraso" value={vehicle.delay === undefined ? undefined : `${vehicle.delay} min`} /></dl>;
}

function DetailContent({ data }: { data: import("../lib/types").VehicleDetail }) {
  const nextStops = selectUpcomingStops(data.stops, data.currentStopSequence);
  return (
    <>
      <dl className="detail-grid">
        <DetailField label="Linha" value={data.route?.name || data.routeId} />
        <DetailField label="Circulação" value={data.journey?.name || data.journey?.description} />
        <DetailField label="Direção" value={data.journey?.direction} />
        <DetailField label="Estado" value={data.status || data.busStatus} />
        <DetailField label="Velocidade" value={data.speed === undefined ? undefined : `${data.speed} km/h`} />
        <DetailField label="Atraso" value={data.delay === undefined ? undefined : `${data.delay} min`} />
        <DetailField label="Hora da posição" value={data.sourceUpdatedAt} />
        <DetailField label="Matrícula" value={data.licensePlate} />
        <DetailField label="Frota" value={data.fleetId} />
      </dl>
      <div className="next-stops">
        <h3>Próximas paragens</h3>
        {nextStops.length ? <ol>{nextStops.map((stop) => <li key={`${stop.id}-${stop.sequence ?? "unknown"}`}><span>{stop.name}</span>{stop.dueInMinutes === undefined ? <small>Não disponível</small> : <small>{stop.dueInMinutes === 0 ? "Agora" : `em ${stop.dueInMinutes} min`}</small>}</li>)}</ol> : <p className="muted">Não disponível</p>}
      </div>
    </>
  );
}

function DetailField({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === "") return null;
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function formatTime(value: number) { return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(value); }
