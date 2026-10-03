import { formatTemporalContext, type DateChoice, type TimeMode } from "../lib/service-time";

interface Props {
  dateChoice: DateChoice;
  serviceDay: string;
  todayKey: string;
  nowSeconds: number;
  timeMode: TimeMode;
  manualTime: string;
  fullDay: boolean;
  onDateChange: (choice: DateChoice) => void;
  onTimeModeChange: (mode: TimeMode) => void;
  onManualTimeChange: (value: string) => void;
  onFullDayChange: (value: boolean) => void;
}

export function JourneyTimeControls({
  dateChoice,
  serviceDay,
  todayKey,
  nowSeconds,
  timeMode,
  manualTime,
  fullDay,
  onDateChange,
  onTimeModeChange,
  onManualTimeChange,
  onFullDayChange,
}: Props) {
  const isToday = serviceDay === todayKey;
  return (
    <section className="journey-time-controls" aria-labelledby="journey-time-title">
      <div className="time-controls-heading">
        <div>
          <p className="eyebrow">Horário</p>
          <h3 id="journey-time-title">Quando queres partir?</h3>
        </div>
        <span className="time-zone-label">Portugal continental</span>
      </div>
      <div className="date-shortcuts" role="group" aria-label="Escolher dia">
        <button type="button" className={dateChoice.kind === "today" ? "is-active" : ""} onClick={() => onDateChange({ kind: "today" })}>Hoje</button>
        <button type="button" className={dateChoice.kind === "tomorrow" ? "is-active" : ""} onClick={() => onDateChange({ kind: "tomorrow" })}>Amanhã</button>
        <label className={`date-picker ${dateChoice.kind === "custom" ? "is-active" : ""}`}>
          <span>Outra data</span>
          <input
            type="date"
            min={todayKey}
            value={dateChoice.kind === "custom" ? dateChoice.value : ""}
            onChange={(event) => {
              if (event.target.value) onDateChange({ kind: "custom", value: event.target.value });
            }}
            aria-label="Escolher outra data"
          />
        </label>
      </div>
      <fieldset className="time-mode-fields" disabled={fullDay}>
        <legend>Hora de partida</legend>
        <label className="time-option">
          <input type="radio" name="journey-time-mode" checked={isToday && timeMode === "now"} onChange={() => onTimeModeChange("now")} disabled={!isToday} />
          <span>Sair agora</span>
        </label>
        <label className="time-option manual-time-option">
          <input type="radio" name="journey-time-mode" checked={timeMode === "manual" || !isToday} onChange={() => onTimeModeChange("manual")} />
          <span>A partir das</span>
          <input type="time" value={manualTime} onChange={(event) => onManualTimeChange(event.target.value)} aria-label="Hora de partida" />
        </label>
      </fieldset>
      <label className="full-day-toggle">
        <span>Ver horário completo deste dia</span>
        <input type="checkbox" checked={fullDay} onChange={(event) => onFullDayChange(event.target.checked)} />
        <span className="ios-switch" aria-hidden="true" />
      </label>
      <p className="temporal-context">{formatTemporalContext(serviceDay, todayKey, timeMode, parseManualSeconds(manualTime), nowSeconds, fullDay)} <span>· Horas de Portugal continental.</span></p>
    </section>
  );
}

function parseManualSeconds(value: string): number | undefined {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 3600 + minutes * 60 : undefined;
}
