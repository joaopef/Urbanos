// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { useJourneyOptions } from "./use-journey-options";
import { fetchJourneyDetail, fetchRouteDetail, fetchRoutes, fetchStopRouteJourneys } from "../lib/api";
import { adaptRouteDetail } from "../lib/adapters";

vi.mock("../lib/api", () => ({ fetchRoutes: vi.fn(), fetchRouteDetail: vi.fn(), fetchJourneyDetail: vi.fn(), fetchStopRouteJourneys: vi.fn(), fetchRouteJourneys: vi.fn(async () => []) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("encontra serviço de outro dia com catálogos por paragem vazios e conserva a validação diária", async () => {
  const route = { id: "4", name: "Linha 4" };
  vi.mocked(fetchRoutes).mockResolvedValue([route]);
  // Actual API route catalogs wrap each stop inside stage.
  vi.mocked(fetchRouteDetail).mockResolvedValue(adaptRouteDetail({ ...route, stops: [{ stage: { id: "a", name: "A" } }, { stage: { id: "b", name: "B" } }] }, "4"));
  vi.mocked(fetchStopRouteJourneys).mockImplementation(async (_stop, _route, day) => day === "2026-10-05" ? [{ journeyId: "Monday", departureTime: 36000 }] : []);
  vi.mocked(fetchJourneyDetail).mockResolvedValue({ routeId: "4", journeyId: "Monday", shape: [], circulations: [{ sequence: 1, stop: { id: "a", name: "A" }, departureTime: 36000 }, { sequence: 2, stop: { id: "b", name: "B" }, arrivalTime: 36600 }] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  function Search({ day }: { day: string }) { const result = useJourneyOptions("a", "b", [], [], day); return <span>{result.isPending ? "loading" : `${result.data?.options.length}:${result.data?.options[0]?.leg.day}`}</span>; }
  const render = async (day: string) => { await act(async () => root.render(<QueryClientProvider client={client}><Search day={day} /></QueryClientProvider>)); };
  try {
    await render("2026-10-05");
    await vi.waitFor(async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); expect(container.textContent).toBe("1:2026-10-05"); });
    expect(fetchStopRouteJourneys).toHaveBeenCalledWith("a", "4", "2026-10-05", expect.any(AbortSignal));
    await render("2026-10-04");
    await vi.waitFor(async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); expect(container.textContent).toBe("0:undefined"); });
    expect(fetchRouteDetail).toHaveBeenCalledTimes(1);
  } finally { await act(async () => root.unmount()); client.clear(); container.remove(); vi.resetAllMocks(); }
});
