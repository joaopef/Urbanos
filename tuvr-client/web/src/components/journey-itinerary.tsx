import type { JourneyOption, StopOccurrence } from "../lib/planner/types";
import { formatServiceTime } from "../lib/time";

interface Props { option: JourneyOption; onClose: () => void; past?: boolean; }

export function JourneyItinerary({ option, onClose, past = false }: Props) {
  const { leg } = option;
  const stops = [...leg.intermediateStops, leg.alighting];
  const departure = formatServiceTime(leg.boarding.departureTime);
  return (
    <section className="itinerary-card" aria-label="Horários da viagem selecionada">
      <div className="detail-heading"><h3>Horários da viagem</h3><button className="icon-button" onClick={onClose} aria-label="Recolher detalhe da viagem">×</button></div>
      {past ? <p className="temporal-warning" role="status">Esta partida já passou, mas o detalhe selecionado continua visível.</p> : null}
      <p className="itinerary-departure">{leg.boarding.stop.name}<small>{departure ? `Apanhar às ${departure}` : "Horário de partida não disponível"}</small></p>
      <div className="itinerary-timetable"><h3>Próximas paragens</h3>
        <StopTimes stops={stops.slice(0, 4)} destinationOrder={leg.alighting.order} />
        {stops.length > 4 ? <details className="remaining-stops"><summary>Mais detalhes · restantes paragens</summary><StopTimes stops={stops.slice(4)} start={5} destinationOrder={leg.alighting.order} /></details> : null}
      </div>
      <p className="planner-disclaimer">Horários programados até ao teu destino. A posição do autocarro, quando disponível, é atualizada em tempo real.</p>
    </section>
  );
}

function StopTimes({ stops, start = 1, destinationOrder }: { stops: StopOccurrence[]; start?: number; destinationOrder: number }) {
  return <ol start={start}>{stops.map((occurrence) => {
    const time = formatServiceTime(occurrence.arrivalTime ?? occurrence.departureTime);
    const destination = occurrence.order === destinationOrder;
    return <li key={`${occurrence.stop.id}-${occurrence.order}`}><span>{occurrence.stop.name}{destination ? " · Destino" : ""}</span><small>{time ? `${destination ? "Chegar às" : "Programado ·"} ${time}` : "Horário não disponível"}</small></li>;
  })}</ol>;
}
