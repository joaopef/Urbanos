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
            <span className="vehicle-badge" style={{ backgroundColor: vehicle.color || vehicle.route?.color || "#536b7b" }} aria-hidden="true">{vehicle.route?.nameShort || "↗"}</span>
            <span className="vehicle-row-copy">
              <strong>{vehicle.route?.id === "9" ? "Linha noturna" : vehicle.route?.nameShort ? `Linha ${vehicle.route.nameShort}` : vehicle.route?.name || "Linha por identificar"}</strong>
              <span>{vehicle.directionLabel || "Ver destino e próximas paragens"}</span>
            </span>
            <span className="vehicle-arrow" aria-hidden="true">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
