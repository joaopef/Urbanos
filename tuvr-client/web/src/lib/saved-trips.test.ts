import { describe, expect, it } from "vitest";
import { addRecentTrip, createShareUrl, parseSavedTrips, parseSharedTrip, resolveTripStops, toggleFavorite } from "./saved-trips";
import type { Stop } from "./types";

describe("viagens guardadas", () => {
  it("ignora conteúdo inválido e valida entradas persistidas", () => {
    expect(parseSavedTrips("not json")).toEqual({ favorites: [], recent: [] });
    expect(parseSavedTrips(JSON.stringify({ favorites: [{ originId: "x", destinationId: "x" }], recent: [{ originId: 2, destinationId: "b" }] }))).toEqual({ favorites: [], recent: [] });
  });

  it("deduplica por utilização recente e limita o histórico a cinco", () => {
    let trips = parseSavedTrips(null);
    for (let i = 0; i < 6; i++) trips = addRecentTrip(trips, { originId: `o${i}`, destinationId: `d${i}` });
    trips = addRecentTrip(trips, { originId: "o3", destinationId: "d3" });
    expect(trips.recent).toHaveLength(5);
    expect(trips.recent[0].originId).toBe("o3");
    expect(trips.recent.filter((trip) => trip.originId === "o3")).toHaveLength(1);
    expect(toggleFavorite(trips, trips.recent[0]).favorites).toHaveLength(1);
  });

  it("resolve IDs apenas contra o catálogo atual", () => {
    const stops = [{ id: "a", name: "A" }, { id: "b", name: "B" }] as Stop[];
    expect(resolveTripStops({ originId: "gone", destinationId: "b" }, stops)).toEqual({ origin: undefined, destination: stops[1] });
  });

  it("não corrompe as viagens quando uma substituição usa paragens iguais", () => {
    const trips = { favorites: [{ originId: "a", destinationId: "b" }], recent: [] };
    expect(addRecentTrip(trips, { originId: "a", destinationId: "a" })).toBe(trips);
    expect(toggleFavorite(trips, { originId: "a", destinationId: "a" })).toBe(trips);
  });

  it("lê parâmetros partilhados válidos e ignora IDs inválidos ou iguais", () => {
    expect(parseSharedTrip("?from=stop-a&to=stop-b")).toEqual({ originId: "stop-a", destinationId: "stop-b" });
    expect(parseSharedTrip("?from=stop-a&to=stop-a")).toBeUndefined();
    expect(parseSharedTrip("?from=%ZZ&to=stop-b")).toBeUndefined();
    expect(parseSharedTrip("?from=x" )).toBeUndefined();
  });

  it("cria um link com apenas os IDs das paragens e preserva o caminho base", () => {
    const url = new URL(createShareUrl("stop-a", "stop-b", "https://example.test/Urbanos/?favorites=private&recent=private"));
    expect(url.pathname).toBe("/Urbanos/");
    expect([...url.searchParams.entries()]).toEqual([["from", "stop-a"], ["to", "stop-b"]]);
  });
});
