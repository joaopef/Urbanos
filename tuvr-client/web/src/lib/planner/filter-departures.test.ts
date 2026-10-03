import { describe, expect, it } from "vitest";
import type { JourneyOption } from "./types";
import { filterDepartures } from "./filter-departures";

function option(id: string, departureTime?: number): JourneyOption {
  const stop = { id: `${id}-stop`, name: id };
  const route = { id: "1", name: "Linha 1", nameShort: "1" };
  return {
    id,
    kind: "direct",
    quality: "confirmed",
    leg: {
      route,
      routeId: route.id,
      journeyId: id,
      day: "2026-09-08",
      boarding: { stop, order: 0, departureTime },
      alighting: { stop: { ...stop, id: `${id}-end`, name: `${id} destino` }, order: 1, arrivalTime: (departureTime ?? 0) + 1200 },
      intermediateStops: [],
    },
  };
}

describe("filterDepartures", () => {
  it("filtra pela partida na paragem de embarque", () => {
    const result = filterDepartures([option("early", 59400), option("late", 60600)], {
      serviceDay: "2026-09-08",
      todayKey: "2026-09-08",
      nowSeconds: 60000,
      timeMode: "now",
      manualTime: "09:00",
      fullDay: false,
    });
    expect(result.visible.map((item) => item.id)).toEqual(["late"]);
  });

  it("separa horários sem partida confirmada", () => {
    const result = filterDepartures([option("unknown"), option("known", 60600)], {
      serviceDay: "2026-09-08",
      todayKey: "2026-09-08",
      nowSeconds: 60000,
      timeMode: "now",
      manualTime: "09:00",
      fullDay: false,
    });
    expect(result.visible.map((item) => item.id)).toEqual(["known"]);
    expect(result.withoutTime.map((item) => item.id)).toEqual(["unknown"]);
  });

  it("mantém o dia completo e marca partidas passadas", () => {
    const result = filterDepartures([option("past", 59400), option("future", 60600)], {
      serviceDay: "2026-09-08",
      todayKey: "2026-09-08",
      nowSeconds: 60000,
      timeMode: "now",
      manualTime: "09:00",
      fullDay: true,
    });
    expect(result.visible.map((item) => item.id)).toEqual(["past", "future"]);
    expect(result.past.map((item) => item.id)).toEqual(["past"]);
  });
});
