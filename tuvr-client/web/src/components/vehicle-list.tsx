import type { VehicleLocation } from "../lib/types";

interface Props {
  vehicles: VehicleLocation[];
  selectedId?: string;
  onSelect: (vehicle: VehicleLocation) => void;
}

export function VehicleList({ vehicles, selectedId, onSelect }: Props) {
  if (!vehicles.length) return <p className="empty-copy">Não há veículos para mostrar neste momento.</p>;
  return (
    <ul className="vehicle-list" aria-label="Veículos disponíveis">
      {vehicles.map((vehicle) => (
        <li key={vehicle.id}>
          <button className={`vehicle-row ${selectedId === vehicle.id ? "is-selected" : ""}`} onClick={() => onSelect(vehicle)}>
            <span className="vehicle-badge" style={{ backgroundColor: vehicle.color || "var(--accent)" }} aria-hidden="true">{vehicle.id.slice(-2)}</span>
            <span className="vehicle-row-copy">
              <strong>{vehicle.route?.nameShort ? `Linha ${vehicle.route.nameShort}` : vehicle.route?.name || (vehicle.routeId ? `Linha ${vehicle.routeId}` : "Consultar linha e percurso")}</strong>
              <span>Veículo {vehicle.id}</span>
            </span>
            <span className="vehicle-arrow" aria-hidden="true">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
