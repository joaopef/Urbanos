import type { JourneyOption, JourneySearchResult } from "../lib/planner/types";
import type { DepartureFilterCriteria, DepartureFilterResult } from "../lib/planner/filter-departures";
import { isPastDeparture } from "../lib/planner/filter-departures";
import { formatServiceTime } from "../lib/time";

interface Props {
  result?: JourneySearchResult;
  loading: boolean;
  error?: Error | null;
  selected?: JourneyOption;
  onSelect: (option: JourneyOption) => void;
  filterResult?: DepartureFilterResult;
  filterCriteria?: DepartureFilterCriteria;
  onViewFullDay?: () => void;
  onViewTomorrow?: () => void;
  emptyMessage?: string;
}

export function JourneyResults({ result, loading, error, selected, onSelect, filterResult, filterCriteria, onViewFullDay, onViewTomorrow, emptyMessage }: Props) {
  if (loading) return <p className="muted">A procurar ligações nas linhas que servem as duas paragens…</p>;
  if (error) return <p className="error-copy">Não foi possível consultar as ligações. Tente novamente quando a API estiver disponível.</p>;
  if (!result) return <p className="muted">Escolha partida e destino para procurar uma ligação direta.</p>;
  const visible = filterResult?.visible ?? result.options;
  const withoutTime = filterResult?.withoutTime ?? [];
  if (!result.options.length && result.unconfirmedRouteIds.length) return <div className="planner-message"><strong>Linhas que servem ambas as paragens — ligação por confirmar.</strong><span>{result.unconfirmedRouteIds.map((id) => `Linha ${id}`).join(", ")}. A API não forneceu variantes com sequência e sentido suficientes para confirmar o percurso.</span></div>;
  if (!result.options.length) return <div className="planner-message"><strong>Não foi encontrada uma ligação direta nos dados disponíveis.</strong><span>{result.incomplete ? "A pesquisa ficou incompleta porque uma ou mais linhas não puderam ser consultadas." : "Isto não exclui uma alternativa com transbordo."}</span></div>;
  if (!visible.length && !withoutTime.length) return <div className="planner-message"><strong>{emptyMessage || "Não há partidas disponíveis para o horário escolhido."}</strong><span>Altere a hora, consulte o dia seguinte ou veja o horário completo deste dia.</span><div className="planner-message-actions">{onViewFullDay ? <button className="button button-small" type="button" onClick={onViewFullDay}>Ver dia completo</button> : null}{onViewTomorrow ? <button className="text-action" type="button" onClick={onViewTomorrow}>Ver amanhã</button> : null}</div></div>;
  const next = filterCriteria ? visible.find((option) => !isPastDeparture(option, filterCriteria)) : undefined;
  return <div className="journey-results"><div className="results-heading"><h3>Ligações diretas</h3><span>{visible.length}</span></div>{result.incomplete ? <p className="search-hint">Resultados parciais: algumas linhas não puderam ser verificadas.</p> : null}<ul>{visible.map((option) => <ResultRow key={option.id} option={option} selected={selected?.id === option.id} onSelect={onSelect} past={Boolean(filterCriteria && isPastDeparture(option, filterCriteria))} next={next?.id === option.id} />)}</ul>{withoutTime.length ? <div className="unconfirmed-schedules"><h4>Ligações sem horário confirmado</h4><p>Estas ligações existem nos dados, mas a hora de partida não foi fornecida.</p><ul>{withoutTime.map((option) => <ResultRow key={option.id} option={option} selected={selected?.id === option.id} onSelect={onSelect} unknown />)}</ul></div> : null}</div>;
}

function ResultRow({ option, selected, onSelect, past, unknown, next }: { option: JourneyOption; selected: boolean; onSelect: (option: JourneyOption) => void; past?: boolean; unknown?: boolean; next?: boolean }) {
  const { leg } = option;
  const departure = formatServiceTime(leg.boarding.departureTime);
  const arrival = formatServiceTime(leg.alighting.arrivalTime ?? leg.alighting.departureTime);
  const status = unknown ? "Horário de partida não confirmado" : next ? "Próxima partida" : past ? "Partida programada já passada" : undefined;
  return <li><button className={`journey-result-row ${selected ? "is-selected" : ""} ${past ? "is-past" : ""} ${next ? "is-next" : ""}`} onClick={() => onSelect(option)}><span className="route-chip" style={{ backgroundColor: leg.route.color || "var(--accent)" }}>{leg.route.nameShort || leg.route.name}</span><span className="journey-result-copy"><strong>{departure && arrival ? `${departure} → ${arrival}` : "Horário indisponível"}</strong><span>{leg.boarding.stop.name} → {leg.alighting.stop.name}</span><small>{status ? `${status} · ` : ""}{leg.direction || "Sentido conforme sequência"} · {leg.intermediateStops.length} intermédias</small></span><span aria-hidden="true">›</span></button></li>;
}
