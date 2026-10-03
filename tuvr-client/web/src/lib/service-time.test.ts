import { describe, expect, it } from "vitest";
import { addLisbonDays, getLisbonClockSeconds, getLisbonDateKey, parseTimeInput, resolveDateChoice } from "./service-time";

describe("service-time", () => {
  it("usa a data e a hora de Portugal continental", () => {
    const value = new Date("2026-09-08T23:30:00.000Z");
    expect(getLisbonDateKey(value)).toBe("2026-09-09");
    expect(getLisbonClockSeconds(value)).toBe(30 * 60);
  });

  it("avança o dia civil sem depender de 24 horas fixas", () => {
    expect(addLisbonDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(resolveDateChoice({ kind: "tomorrow" }, new Date("2026-09-08T23:30:00.000Z"))).toBe("2026-09-10");
  });

  it("converte uma hora manual em segundos desde a meia-noite", () => {
    expect(parseTimeInput("16:30")).toBe(59400);
    expect(parseTimeInput("24:00")).toBeUndefined();
  });
});
