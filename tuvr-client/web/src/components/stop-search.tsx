import { useMemo, useState } from "react";
import type { Stop } from "../lib/types";

interface Props {
  label: string;
  selected?: Stop;
  stops: Stop[];
  onSelect: (stop: Stop | undefined) => void;
  onHoverStop?: (stop?: Stop) => void;
  disabled?: boolean;
}

export function StopSearch({ label, selected, stops, onSelect, onHoverStop, disabled }: Props) {
  const [text, setText] = useState("");
  const normalized = normalize(text);
  const suggestions = useMemo(() => {
    if (!normalized || selected) return [];
    return stops.filter((stop) => normalize(`${stop.name} ${stop.nameShort ?? ""} ${stop.id}`).includes(normalized)).slice(0, 8);
  }, [normalized, selected, stops]);

  if (selected) {
    return (
      <div className="stop-field">
        <span>{label}</span>
        <div className="selected-stop" onMouseEnter={() => onHoverStop?.(selected)} onMouseLeave={() => onHoverStop?.(undefined)}><span><strong>{selected.name}</strong><small>Código {selected.id}</small></span><button type="button" onClick={() => { onHoverStop?.(undefined); onSelect(undefined); setText(""); }} disabled={disabled} aria-label={`Limpar ${label.toLowerCase()}`}>×</button></div>
      </div>
    );
  }

  return (
    <div className="stop-field">
      <label htmlFor={`stop-search-${slug(label)}`}>{label}</label>
      <input id={`stop-search-${slug(label)}`} value={text} onChange={(event) => { onHoverStop?.(undefined); setText(event.target.value); }} placeholder="Nome ou código da paragem" disabled={disabled} autoComplete="off" />
      {suggestions.length ? <ul className="stop-suggestions" aria-label={`Sugestões para ${label}`} onMouseLeave={() => onHoverStop?.(undefined)}>{suggestions.map((stop) => <li key={stop.id}><button type="button" onMouseEnter={() => onHoverStop?.(stop)} onFocus={() => onHoverStop?.(stop)} onBlur={() => onHoverStop?.(undefined)} onClick={() => { onHoverStop?.(undefined); onSelect(stop); setText(""); }}><span>{stop.name}</span><small>{stop.id}</small></button></li>)}</ul> : null}
      {normalized && !suggestions.length ? <p className="search-hint">Nenhuma paragem corresponde à pesquisa.</p> : null}
    </div>
  );
}

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT").trim(); }
function slug(value: string) { return normalize(value).replace(/[^a-z0-9]+/g, "-"); }
