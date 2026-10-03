import { describe, expect, it } from "vitest";
import { adaptJourneyDetail, adaptRouteDetail, adaptStopRouteJourneys, adaptVehicle, adaptVehicleDetail, adaptStopRoutes, normalizeColor } from "./adapters";

describe("adapters", () => {
  it("normalizes valid colours and rejects unsupported values", () => {
    expect(normalizeColor("146ef5")).toBe("#146ef5");
    expect(normalizeColor("#abc")).toBe("#abc");
    expect(normalizeColor("rgb(1, 2, 3)")).toBeUndefined();
  });

  it("keeps optional fields absent and rejects invalid coordinates", () => {
    expect(adaptVehicle({ id: 11010103, position: { lat: 41.3, lon: -7.7 }, speed: null })).toMatchObject({
      id: "11010103",
      position: { lat: 41.3, lon: -7.7 },
    });
    expect(adaptVehicle({ id: "bad", position: { lat: 141, lon: -7.7 } })?.position).toBeUndefined();
  });

  it("normalizes route stops and preserves a valid shape", () => {
    const detail = adaptRouteDetail({
      id: 22,
      name: "Linha 22",
      color: "146ef5",
      stops: [{ id: 2, name: "Centro", position: { lat: 41.3, lon: -7.7 }, sequence: 1 }],
      shape: [[41.3, -7.7], [41.31, -7.71]],
    }, "22");
    expect(detail.route).toMatchObject({ id: "22", color: "#146ef5" });
    expect(detail.stops[0].position).toEqual({ lat: 41.3, lon: -7.7 });
    expect(detail.shape).toHaveLength(2);
    expect(detail.variants).toEqual([]);
    expect(detail.variantDataAvailable).toBe(false);
  });

  it("only accepts route variants with explicit ordered sequences", () => {
    const detail = adaptRouteDetail({
      id: 22,
      variants: [{ direction: "Centro", stops: [{ id: 1, name: "A", sequence: 1 }, { id: 2, name: "B", sequence: 2 }] }, { direction: "Sem ordem", stops: [{ id: 2, name: "B" }, { id: 1, name: "A" }] }],
    }, "22");
    expect(detail.variants).toHaveLength(1);
    expect(detail.variants[0].direction).toBe("Centro");
    expect(detail.variantDataAvailable).toBe(true);
  });

  it("adapts circulation stages nested in a journey", () => {
    const detail = adaptVehicleDetail({
      id: "11010103",
      journey: { name: "Circular Centro", circulations: [{ sequence: 3, dueInMinutes: 6, stage: { stop: { id: 1198, name: "Avenida", position: { lat: 41.3, lon: -7.7 } } } }] },
    }, "11010103");
    expect(detail.stops[0]).toMatchObject({ id: "1198", name: "Avenida", sequence: 3, dueInMinutes: 6 });
  });

  it("adapts routes serving a stop without fabricating schedules", () => {
    const services = adaptStopRoutes([{ id: 22, name: "Linha 22", journeys: [{ id: "j1", start: 36000 }] }]);
    expect(services[0].route.id).toBe("22");
    expect(services[0].journeys[0]).toMatchObject({ id: "j1", start: 36000 });
  });

  it("adapts StopTimeModel payloads using journeyId", () => {
    expect(adaptStopRouteJourneys([
      { journeyId: 1725, departure: "16:30:00", departureTime: 59400, direction: 0 },
      { journeyId: 1726, departure: "16:50:00", departureTime: 60600, direction: 0 },
      { id: null, departure: "invalid" },
    ])).toEqual([
      { journeyId: "1725", departure: "16:30:00", departureTime: 59400, direction: 0 },
      { journeyId: "1726", departure: "16:50:00", departureTime: 60600, direction: 0 },
    ]);
  });

  it("sorts and validates journey circulations without collapsing repeated stops", () => {
    const detail = adaptJourneyDetail({
      id: 1725,
      direction: 0,
      circulations: [
        { sequence: 3, stage: { stop: { id: "A", name: "A" } }, departureTime: 120 },
        { sequence: 1, stage: { stop: { id: "A", name: "A" } }, departureTime: 60 },
        { sequence: 2, stage: { stop: { id: "B", name: "B" } }, departureTime: 90 },
      ],
    }, "4", "1725");
    expect(detail?.circulations.map((item) => item.sequence)).toEqual([1, 2, 3]);
    expect(detail?.circulations.map((item) => item.stop.id)).toEqual(["A", "B", "A"]);
    expect(detail?.direction).toBe("Sentido A");
    expect(adaptJourneyDetail({ circulations: [{ stage: { stop: { id: "A", name: "A" } } }] }, "4", "1725")).toBeNull();
  });
});
