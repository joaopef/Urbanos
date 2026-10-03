import { useState } from "react";
import type { Stop } from "../lib/types";
import { resolveTripStops, tripKey, type SavedTrip } from "../lib/saved-trips";

interface Props {
  favorites: SavedTrip[]; recent: SavedTrip[]; stops: Stop[];
  onSelect: (trip: SavedTrip) => void; onToggleFavorite: (trip: SavedTrip) => void;
  onRemoveRecent: (trip: SavedTrip) => void; onRenameFavorite: (trip: SavedTrip, name?: string) => void;
  onReplaceMissing: (trip: SavedTrip, replacement: SavedTrip) => void;
  onClearRecent: () => void;
}

export function SavedTripsShelf({ favorites, recent, stops, onSelect, onToggleFavorite, onRemoveRecent, onRenameFavorite, onReplaceMissing, onClearRecent }: Props) {
  const [expanded, setExpanded] = useState(false);
  const list = (title: string, entries: SavedTrip[], isFavorite: boolean) => {
    if (!entries.length) return null;
    const shown = expanded ? entries : entries.slice(0, 3);
    return <section className="saved-trip-group" aria-label={title}>
      <div className="saved-trip-heading"><h3>{title}</h3>{isFavorite ? null : <button type="button" className="text-action" onClick={onClearRecent}>Limpar histórico</button>}</div>
      <ul>{shown.map((trip) => {
        const pinned = favorites.some((entry) => tripKey(entry) === tripKey(trip)); const resolved = resolveTripStops(trip, stops); const missing = !resolved.origin || !resolved.destination;
        const pair = `${resolved.origin?.name ?? "Paragem removida"} → ${resolved.destination?.name ?? "Paragem removida"}`;
        return <li key={tripKey(trip)} className="saved-trip-row">
          {missing ? <div className="saved-trip-missing"><strong>{trip.name || pair}</strong><span>Uma paragem já não existe no catálogo. Escolha novas paragens antes de usar esta viagem.</span><label>Partida<select value={resolved.origin?.id ?? ""} onChange={(event) => { const originId = event.target.value; if (originId) onReplaceMissing(trip, { originId, destinationId: resolved.destination?.id ?? trip.destinationId }); }}><option value="">Escolher paragem…</option>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></label><label>Destino<select value={resolved.destination?.id ?? ""} onChange={(event) => { const destinationId = event.target.value; if (destinationId) onReplaceMissing(trip, { originId: resolved.origin?.id ?? trip.originId, destinationId }); }}><option value="">Escolher paragem…</option>{stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></label></div>
            : <button className="saved-trip-select" type="button" onClick={() => onSelect(trip)}><strong>{trip.name || pair}</strong><span>{trip.name ? pair : isFavorite ? "Favorita" : "Recentemente usada"}</span></button>}
          <div className="saved-trip-actions">{isFavorite ? <button type="button" aria-label="Mudar nome da viagem favorita" onClick={() => { const name = prompt("Nome da viagem", trip.name || ""); if (name !== null) onRenameFavorite(trip, name.trim() || undefined); }}>✎</button> : null}<button type="button" aria-label={pinned ? "Desafixar viagem" : "Fixar viagem"} onClick={() => onToggleFavorite(trip)}>{pinned ? "★" : "☆"}</button>{!isFavorite ? <button type="button" aria-label="Remover viagem recente" onClick={() => onRemoveRecent(trip)}>×</button> : null}</div>
        </li>;
      })}</ul>
      {!expanded && entries.length > 3 ? <button className="text-action" type="button" onClick={() => setExpanded(true)}>Ver todas ({entries.length})</button> : null}
    </section>;
  };
  return <section className="saved-trips" aria-labelledby="saved-trips-title"><div className="saved-trips-title"><h3 id="saved-trips-title">As tuas viagens</h3></div>{favorites.length || recent.length ? <>{list("Favoritas", favorites, true)}{list("Recentes", recent, false)}</> : <p className="saved-trips-empty">As viagens que fixares ou pesquisares aparecem aqui. Ficam guardadas neste navegador.</p>}</section>;
}
