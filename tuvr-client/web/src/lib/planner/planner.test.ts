import { describe, expect, it } from "vitest";
import { findDirectConnections } from "./direct-connections";
import type { RouteVariant } from "./types";

const stop = (id: string, name = id) => ({ id, name, position: { lat: 41.3, lon: -7.7 } });
const variant = (routeId: string, ids: string[], direction?: string): RouteVariant => ({
  route: { id: routeId, name: `Linha ${routeId}` },
  direction,
  occurrences: ids.map((id, order) => ({ stop: stop(id), order })),
});

describe("direct connections", () => {
  it("accepts only the direction where boarding precedes alighting", () => {
    const result = findDirectConnections("A", "C", [variant("1", ["C", "B", "A"], "Norte"), variant("1", ["A", "B", "C"], "Sul")]);
    expect(result.options).toHaveLength(1);
    expect(result.options[0].leg.direction).toBe("Sul");
  });

  it("keeps variants and orders by the number of intermediate stops", () => {
    const result = findDirectConnections("A", "D", [variant("2", ["A", "B", "C", "D"], "Longo"), variant("1", ["A", "D"], "Direto")]);
    expect(result.options.map((option) => option.leg.route.id)).toEqual(["1", "2"]);
  });

  it("handles repeated stops by occurrence instead of collapsing the ID", () => {
    const result = findDirectConnections("A", "C", [variant("3", ["A", "B", "A", "C"], "Circular")]);
    expect(result.options[0].leg.boarding.order).toBe(2);
    expect(result.options[0].leg.alighting.order).toBe(3);
  });

  it("does not claim a connection when shared stops are in the wrong order", () => {
    const result = findDirectConnections("A", "D", [variant("4", ["D", "B", "A"]) ]);
    expect(result.options).toEqual([]);
    expect(result.candidateRouteIds).toEqual(["4"]);
  });

  it("keeps different journeys on the same route distinct", () => {
    const first = { ...variant("5", ["A", "B", "C"], "Sul"), journeyId: "1725", day: "2026-09-07" };
    const second = { ...variant("5", ["A", "B", "C"], "Sul"), journeyId: "1726", day: "2026-09-07" };
    const result = findDirectConnections("A", "C", [first, second]);
    expect(result.options).toHaveLength(2);
    expect(new Set(result.options.map((option) => option.id))).toEqual(new Set([
      "5:1725:2026-09-07:0:2",
      "5:1726:2026-09-07:0:2",
    ]));
    expect(result.options.every((option) => option.leg.journeyId && option.leg.day === "2026-09-07")).toBe(true);
  });

  it("orders direct connections by boarding time before route name", () => {
    const later = variant("1", ["A", "B", "C"], "Sul");
    later.occurrences[0].departureTime = 8 * 3600 + 40 * 60;
    later.occurrences[2].arrivalTime = 9 * 3600;
    const earlier = variant("9", ["A", "B", "C"], "Sul");
    earlier.occurrences[0].departureTime = 7 * 3600 + 54 * 60;
    earlier.occurrences[2].arrivalTime = 8 * 3600 + 15 * 60;
    const result = findDirectConnections("A", "C", [later, earlier]);
    expect(result.options.map((option) => option.leg.route.id)).toEqual(["9", "1"]);
  });
});
