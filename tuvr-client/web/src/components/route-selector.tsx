import type { TransitRoute } from "../lib/types";

interface Props {
  routes: TransitRoute[];
  selectedRouteId?: string;
  onChange: (routeId: string | undefined) => void;
  disabled?: boolean;
}

export function RouteSelector({ routes, selectedRouteId, onChange, disabled }: Props) {
  return (
    <label className="field">
      <span>Linha</span>
      <select
        value={selectedRouteId ?? "all"}
        onChange={(event) => onChange(event.target.value === "all" ? undefined : event.target.value)}
        disabled={disabled}
        aria-label="Selecionar linha"
      >
        <option value="all">Todas as linhas</option>
        {routes.map((route) => <option key={route.id} value={route.id}>{route.id === "9" ? "N · Noturna" : route.nameShort || route.name}</option>)}
      </select>
    </label>
  );
}
