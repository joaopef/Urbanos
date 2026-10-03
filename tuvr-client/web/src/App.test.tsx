// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { fetchStopRoutes, fetchStopRouteJourneys, fetchJourneyDetail, fetchLocations, fetchVehicleDetail } from "./lib/api";
import { adaptVehicleDetail } from "./lib/adapters";
import type { StopRouteService, StopJourneyTime, JourneyDetail, VehicleLocation, VehicleDetail } from "./lib/types";

vi.mock("./components/transit-map", () => ({ TransitMap: () => null }));
vi.mock("./lib/api", () => ({
  fetchRoutes: async () => [],
  fetchStops: async () => [{ id: "a", name: "Partida de teste" }, { id: "b", name: "Destino de teste" }],
  fetchLocations: vi.fn(async (): Promise<VehicleLocation[]> => []),
  fetchStopRoutes: vi.fn(async (): Promise<StopRouteService[]> => []),
  fetchStopRouteJourneys: vi.fn(async (): Promise<StopJourneyTime[]> => []),
  fetchRouteJourneys: async () => [],
  fetchJourneyDetail: vi.fn(async (): Promise<JourneyDetail | null> => null),
  fetchRouteDetail: async () => null,
  fetchVehicleDetail: vi.fn(async (): Promise<VehicleDetail> => ({ id: "unknown", stops: [] })),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.restoreAllMocks(); vi.mocked(fetchLocations).mockReset().mockResolvedValue([]); vi.mocked(fetchVehicleDetail).mockReset().mockResolvedValue({ id: "unknown", stops: [] }); vi.mocked(fetchStopRoutes).mockResolvedValue([]); vi.mocked(fetchStopRouteJourneys).mockResolvedValue([]); vi.mocked(fetchJourneyDetail).mockResolvedValue(null); window.history.replaceState(null, "", "/"); });

async function renderApp() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () => { root.render(<QueryClientProvider client={client}><App /></QueryClientProvider>); });
  return { container, cleanup: async () => { await act(async () => root.unmount()); client.clear(); container.remove(); } };
}

describe("planeador com armazenamento indisponível", () => {
  it("redimensiona o painel por toque e recolhe ao arrastar até ao fundo", async () => {
    const widthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth")!;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const app = await renderApp();
    try {
      const handle = app.container.querySelector<HTMLButtonElement>('.panel-grabber')!;
      const panel = app.container.querySelector<HTMLElement>('#control-panel')!;
      handle.setPointerCapture = vi.fn(); handle.releasePointerCapture = vi.fn();
      vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({ height: 88 } as DOMRect);
      const touch = async (type: string, y: number) => {
        const event = new MouseEvent(type, { bubbles: true, button: 0, clientY: y });
        Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "touch" } });
        await act(async () => { handle.dispatchEvent(event); });
      };
      await touch("pointerdown", 700); await touch("pointermove", 388); await touch("pointerup", 388);
      expect(handle.getAttribute("aria-valuenow")).toBe("400");
      expect(panel.classList.contains("mobile-open")).toBe(true);
      expect(app.container.querySelector<HTMLElement>('.app-shell')!.style.getPropertyValue('--mobile-panel-height')).toBe("400px");
      expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
      vi.mocked(panel.getBoundingClientRect).mockReturnValue({ height: 400 } as DOMRect);
      await touch("pointerdown", 388); await touch("pointermove", 800); await touch("pointerup", 800);
      expect(panel.classList.contains("mobile-open")).toBe(false);
      expect(app.container.querySelector('.mobile-panel-is-dragging')).toBeNull();
    } finally { await app.cleanup(); Object.defineProperty(window, "innerWidth", widthDescriptor); }
  });
  it("identifica a linha e o destino quando as posições não incluem a rota", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.mocked(fetchLocations).mockResolvedValue([{ id: "bus", color: "#ff0000" }]);
    vi.mocked(fetchVehicleDetail).mockResolvedValue(adaptVehicleDetail({ id: "bus", route: { id: "1", name: "LORDELO - UTAD", nameShort: "1" }, journey: { direction: 1, circulations: [
      { sequence: 1, stage: { id: "hospital", name: "HOSPITAL" } },
      { sequence: 2, stage: { id: "lordelo", name: "LORDELO" } },
    ] } }, "bus"));
    const app = await renderApp();
    try {
      await vi.waitFor(async () => {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
        expect(app.container.querySelector('.vehicle-row-copy strong')?.textContent).toBe("Linha 1");
      });
      expect(app.container.querySelector('.vehicle-row-copy span')?.textContent).toBe("Sentido LORDELO");
      expect(fetchVehicleDetail).toHaveBeenCalledTimes(1);
    } finally { await app.cleanup(); }
  });
  it("seleciona uma ligação direta mantendo o painel móvel aberto", async () => {
    const route = { id: "1", name: "Linha de teste", nameShort: "1" };
    vi.mocked(fetchStopRoutes).mockResolvedValue([{ route, journeys: [] }]);
    vi.mocked(fetchStopRouteJourneys).mockResolvedValue([{ journeyId: "test", departureTime: 90000 }]);
    vi.mocked(fetchJourneyDetail).mockResolvedValue({ routeId: "1", journeyId: "test", shape: [], circulations: [
      { sequence: 1, stop: { id: "a", name: "Partida de teste" }, departureTime: 90000 },
      { sequence: 2, stop: { id: "b", name: "Destino de teste" }, arrivalTime: 90600 },
    ] });
    window.history.replaceState(null, "", "/?from=a&to=b");
    const app = await renderApp();
    try {
      await vi.waitFor(async () => {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
        expect(app.container.querySelector('.journey-result-row.is-next')).not.toBeNull();
      });
      await act(async () => app.container.querySelector<HTMLButtonElement>('.journey-result-row')!.click());
      expect(app.container.querySelector('.itinerary-card')).not.toBeNull();
      expect(app.container.querySelector('#control-panel')?.classList.contains('mobile-open')).toBe(true);
    } finally { await app.cleanup(); }
  });
  it.each(["read", "write"])("continua a pesquisar e fixar viagens quando falha %s", async (failure) => {
    if (failure === "read") vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    else vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    window.history.replaceState(null, "", "/?from=a&to=b");
    const app = await renderApp();
    try {
      await vi.waitFor(async () => {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
        expect(app.container.textContent).toContain("Recentemente usada");
      });
      const pin = app.container.querySelector<HTMLButtonElement>('[aria-label="Fixar viagem"]');
      expect(pin).not.toBeNull();
      await act(async () => pin!.click());
      expect(app.container.querySelector('[aria-label="Desafixar viagem"]')).not.toBeNull();
      expect(app.container.querySelector('.selected-stop strong')?.textContent).toBe("Partida de teste");
    } finally { await app.cleanup(); }
  });

  it.each(["?from=a", "?from=removed&to=b"])("explica uma ligação inválida ou com paragem removida: %s", async (search) => {
    window.history.replaceState(null, "", `/${search}`);
    const app = await renderApp();
    try {
      await vi.waitFor(async () => {
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
        expect(app.container.querySelector('[role="status"]')?.textContent).toMatch(/inválida|já não existe/);
      });
      expect(app.container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("Planear viagem");
    } finally { await app.cleanup(); }
  });
});
