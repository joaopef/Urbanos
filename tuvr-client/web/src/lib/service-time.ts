export const LISBON_TIME_ZONE = "Europe/Lisbon";

export type TimeMode = "now" | "manual";

export type DateChoice =
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "custom"; value: string };

interface LisbonDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const lisbonPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LISBON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getLisbonDateParts(value: Date): LisbonDateParts {
  const parts = Object.fromEntries(
    lisbonPartsFormatter.formatToParts(value).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

export function getLisbonDateKey(value: Date): string {
  const parts = getLisbonDateParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getLisbonClockSeconds(value: Date): number {
  const parts = getLisbonDateParts(value);
  return parts.hour * 3600 + parts.minute * 60 + parts.second;
}

export function addLisbonDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function resolveDateChoice(choice: DateChoice, now: Date): string {
  if (choice.kind === "today") return getLisbonDateKey(now);
  if (choice.kind === "tomorrow") return addLisbonDays(getLisbonDateKey(now), 1);
  return choice.value;
}

export function parseTimeInput(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 3600 + minutes * 60;
}

export function normalizeServiceTime(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0 || value > 48 * 3600) return undefined;
  return value;
}

export function formatLisbonDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: LISBON_TIME_ZONE,
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatTemporalContext(
  serviceDay: string,
  todayKey: string,
  timeMode: TimeMode,
  manualSeconds: number | undefined,
  nowSeconds: number,
  fullDay: boolean,
): string {
  if (fullDay) return `Horário completo · ${formatLisbonDate(serviceDay)}`;
  const dayLabel = serviceDay === todayKey
    ? "Hoje"
    : serviceDay === addLisbonDays(todayKey, 1) ? "Amanhã" : formatLisbonDate(serviceDay);
  const timeLabel = timeMode === "now" ? formatSecondsAsTime(nowSeconds) : formatSecondsAsTime(manualSeconds ?? 0);
  return `${dayLabel} · a partir ${timeMode === "now" ? "de agora" : `das ${timeLabel}`}`;
}

export function formatSecondsAsTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
