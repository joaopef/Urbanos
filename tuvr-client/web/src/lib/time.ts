export function formatServiceTime(value?: number): string | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined;
  const minutes = Math.floor(value / 60) % (24 * 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
