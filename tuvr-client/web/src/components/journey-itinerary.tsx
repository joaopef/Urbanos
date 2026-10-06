import { useEffect, useRef } from "react";
import type { JourneyOption } from "../lib/planner/types";
import { formatServiceTime } from "../lib/time";

interface Props { option: JourneyOption; onClose: () => void; past?: boolean; }

export function JourneyItinerary({ option, onClose, past = false }: Props) {
  const card = useRef<HTMLElement>(null);
  useEffect(() => { card.current?.scrollIntoView?.({ block: "start", behavior: "instant" }); }, [option.id]);
  const { leg } = option;
  const departure = formatServiceTime(leg.boarding.departureTime);
  const arrival = formatServiceTime(leg.alighting.arrivalTime ?? leg.alighting.departureTime);
  return (
    <section ref={card} className="itinerary-card" aria-labelledby="itinerary-title">
      <div className="detail-heading"><div><p className="eyebrow">Ligação direta</p><h2 id="itinerary-title">{leg.route.name}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar percurso">×</button></div>
      <p className="itinerary-direction">{leg.direction || "Sentido conforme a sequência disponível"}</p>
      {past ? <p className="temporal-warning" role="status">Esta partida já passou, mas o detalhe selecionado continua visível.</p> : null}
      <div className="itinerary-stop"><span className="journey-dot journey-dot-start" aria-hidden="true" /><div><small>Apanhar às {departure || "—"}</small><strong>{leg.boarding.stop.name}</strong><span>Código {leg.boarding.stop.id}</span></div></div>
      <div className="itinerary-line" aria-hidden="true" />
      {leg.intermediateStops.length ? <div className="itinerary-timetable"><h3>Passagem nas paragens</h3><ol>{leg.intermediateStops.map((occurrence) => {
        const time = formatServiceTime(occurrence.arrivalTime ?? occurrence.departureTime);
        return <li key={`${occurrence.stop.id}-${occurrence.order}`}><span>{occurrence.stop.name}</span><small>{time ? `Programado · ${time}` : "Horário não disponível"}</small></li>;
      })}</ol></div> : <p className="itinerary-intermediate">Sem paragens intermédias.</p>}
      <div className="itinerary-stop"><span className="journey-dot journey-dot-end" aria-hidden="true" /><div><small>Chegar às {arrival || "—"}</small><strong>{leg.alighting.stop.name}</strong><span>Código {leg.alighting.stop.id}</span></div></div>
      <p className="planner-disclaimer">Horários programados da circulação {leg.journeyId || "selecionada"}. A posição do autocarro, quando disponível, é atualizada em tempo real.</p>
    </section>
  );
}
