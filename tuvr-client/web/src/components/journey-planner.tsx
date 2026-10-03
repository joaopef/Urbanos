import type { JourneyOption } from "../lib/planner/types";
import type { Stop, StopRouteService } from "../lib/types";
import { filterDepartures, isPastDeparture, type DepartureFilterCriteria } from "../lib/planner/filter-departures";
import { getLisbonClockSeconds, type DateChoice, type TimeMode } from "../lib/service-time";
import { JourneyItinerary } from "./journey-itinerary";
import { JourneyResults } from "./journey-results";
import { StopSearch } from "./stop-search";
import { JourneyTimeControls } from "./journey-time-controls";

interface Props {
  stops: Stop[];
  origin?: Stop;
  destination?: Stop;
  onOriginChange: (stop?: Stop) => void;
  onDestinationChange: (stop?: Stop) => void;
  onSwap: () => void;
  originRoutes: { data?: StopRouteService[]; isPending: boolean; isError: boolean; refetch: () => unknown };
  destinationRoutes: { data?: StopRouteService[]; isPending: boolean; isError: boolean; refetch: () => unknown };
  options: { data?: { options: JourneyOption[]; incomplete: boolean; candidateRouteIds: string[]; unconfirmedRouteIds: string[] }; isPending: boolean; isError: boolean; error: Error | null };
  selected?: JourneyOption;
  onHoverStop?: (stop?: Stop) => void;
  onSelect: (option: JourneyOption) => void;
  onCloseItinerary: () => void;
  dateChoice: DateChoice;
  serviceDay: string;
  todayKey: string;
  now: Date;
  timeMode: TimeMode;
  manualTime: string;
  fullDay: boolean;
  onDateChange: (choice: DateChoice) => void;
  onTimeModeChange: (mode: TimeMode) => void;
  onManualTimeChange: (value: string) => void;
  onFullDayChange: (value: boolean) => void;
  onViewTomorrow: () => void;
}

export function JourneyPlanner({ stops, origin, destination, onOriginChange, onDestinationChange, onSwap, originRoutes, destinationRoutes, options, selected, onHoverStop, onSelect, onCloseItinerary, dateChoice, serviceDay, todayKey, now, timeMode, manualTime, fullDay, onDateChange, onTimeModeChange, onManualTimeChange, onFullDayChange, onViewTomorrow }: Props) {
  const sameStop = Boolean(origin && destination && origin.id === destination.id);
  const catalogError = originRoutes.isError || destinationRoutes.isError;
  const filterCriteria: DepartureFilterCriteria = { serviceDay, todayKey, nowSeconds: getLisbonClockSeconds(now), timeMode, manualTime, fullDay };
  const filterResult = options.data ? filterDepartures(options.data.options, filterCriteria) : undefined;
  const emptyMessage = fullDay
    ? "Sem partidas encontradas para esta data"
    : serviceDay === todayKey && timeMode === "now" ? "Sem mais partidas para hoje" : `Sem partidas a partir das ${manualTime} neste dia`;
  return (
    <section className="planner" aria-labelledby="planner-title">
      <div className="panel-section-heading"><div><p className="eyebrow">Planeador</p><h2 id="planner-title">Planear viagem</h2></div><span className="planner-symbol" aria-hidden="true">↗</span></div>
      <div className="planner-fields">
        <StopSearch label="Partida" selected={origin} stops={stops} onSelect={onOriginChange} onHoverStop={onHoverStop} disabled={!stops.length} />
        <StopSearch label="Destino" selected={destination} stops={stops} onSelect={onDestinationChange} onHoverStop={onHoverStop} disabled={!stops.length} />
        <button className="swap-button" type="button" onClick={onSwap} disabled={!origin && !destination} aria-label="Inverter partida e destino">↕ <span>Inverter</span></button>
      </div>
      <JourneyTimeControls dateChoice={dateChoice} serviceDay={serviceDay} todayKey={todayKey} nowSeconds={filterCriteria.nowSeconds} timeMode={timeMode} manualTime={manualTime} fullDay={fullDay} onDateChange={onDateChange} onTimeModeChange={onTimeModeChange} onManualTimeChange={onManualTimeChange} onFullDayChange={onFullDayChange} />
      {sameStop ? <p className="error-copy">Partida e destino têm de ser paragens diferentes.</p> : null}
      {catalogError ? <div className="planner-message"><strong>Não foi possível carregar as linhas das paragens.</strong><button className="button button-small" onClick={() => { void originRoutes.refetch(); void destinationRoutes.refetch(); }}>Tentar novamente</button></div> : null}
      {!catalogError && !sameStop && origin && destination ? <JourneyResults result={options.data} loading={originRoutes.isPending || destinationRoutes.isPending || options.isPending} error={options.isError ? options.error : null} selected={selected} onSelect={onSelect} filterResult={filterResult} filterCriteria={filterCriteria} emptyMessage={emptyMessage} onViewFullDay={() => onFullDayChange(true)} onViewTomorrow={serviceDay === todayKey ? onViewTomorrow : undefined} /> : <JourneyResults loading={false} onSelect={onSelect} />}
      {selected ? <JourneyItinerary option={selected} onClose={onCloseItinerary} past={isPastDeparture(selected, filterCriteria)} /> : null}
    </section>
  );
}
