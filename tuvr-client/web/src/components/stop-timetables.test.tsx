// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VehicleDetails } from "./vehicle-details";
import { JourneyItinerary } from "./journey-itinerary";
import { JourneyResults } from "./journey-results";
import type { JourneyOption } from "../lib/planner/types";

vi.mock("../hooks/use-vehicle-detail", () => ({ useVehicleDetail: () => ({
  data: { id: "bus", currentStopSequence: 1, stops: [
    { id: "past", name: "Já passou", sequence: 1, arrivalTime: "10:00" },
    ...Array.from({ length: 7 }, (_, index) => ({ id: `stop-${index}`, name: `Paragem ${index}`, sequence: index + 2, arrivalTime: `10:0${index + 1}`, dueInMinutes: index === 0 ? 0 : undefined })),
  ] },
  isPending: false, isError: false,
}) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); });

async function render(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(element); });
  cleanup = async () => { await act(async () => root.unmount()); container.remove(); };
  return container;
}

describe("horários por paragem", () => {
  it("expands beyond four upcoming stops through the terminus, excluding passed stops", async () => {
    const container = await render(<VehicleDetails vehicle={{ id: "bus" }} onClose={() => {}} />);
    expect(container.querySelector('.next-stops > ol')?.children).toHaveLength(4);
    const more = container.querySelector<HTMLDetailsElement>('.remaining-stops')!;
    expect(more.open).toBe(false);
    more.open = true;
    expect(more.querySelectorAll('li')).toHaveLength(3);
    expect(more.querySelector('ol')?.start).toBe(5);
    expect(more.textContent).toContain("Paragem 6");
    expect(more.textContent).toContain("Programado · 10:07");
    expect(container.textContent).not.toContain("Já passou");
    expect(container.textContent).toContain("Tempo real · agora");
    expect(container.textContent).toContain("Programado · 10:01");
  });

  it("shows intermediate times in occurrence order, preserving repeated stops and missing schedules", async () => {
    const option: JourneyOption = { id: "trip", kind: "direct", quality: "confirmed", leg: {
      route: { id: "1", name: "Linha 1" },
      boarding: { stop: { id: "a", name: "Origem" }, order: 1, departureTime: 85800 },
      intermediateStops: [
        { stop: { id: "a", name: "Origem novamente" }, order: 2, arrivalTime: 86100 },
        { stop: { id: "b", name: "Meia-noite" }, order: 3, departureTime: 86460 },
        { stop: { id: "c", name: "Sem hora" }, order: 4 },
      ],
      alighting: { stop: { id: "d", name: "Destino" }, order: 5, arrivalTime: 86700 },
    } };
    const container = await render(<JourneyItinerary option={option} onClose={() => {}} />);
    const rows = [...container.querySelectorAll('.itinerary-timetable li')];
    expect(rows.map((row) => row.textContent)).toEqual([
      "Origem novamenteProgramado · 23:55", "Meia-noiteProgramado · 00:01", "Sem horaHorário não disponível", "Destino · DestinoChegar às 00:05",
    ]);
    expect(container.textContent).toContain("Apanhar às 23:50");
    expect(container.textContent).toContain("Chegar às 00:05");
  });

  it("expands the chosen row in place with four stops, more details, and collapse on a second click", async () => {
    const option: JourneyOption = { id: "first", kind: "direct", quality: "confirmed", leg: {
      route: { id: "1", name: "Linha 1" },
      boarding: { stop: { id: "a", name: "Origem" }, order: 0, departureTime: 36000 },
      intermediateStops: Array.from({ length: 6 }, (_, i) => ({ stop: { id: `s${i}`, name: `Paragem ${i + 1}` }, order: i + 1, arrivalTime: 36060 + i * 60 })),
      alighting: { stop: { id: "z", name: "Fim" }, order: 7, arrivalTime: 36420 },
    } };
    const other = { ...option, id: "second" };
    function Results() {
      const [selected, setSelected] = useState<JourneyOption>();
      return <JourneyResults result={{ options: [option, other], incomplete: false, candidateRouteIds: ["1"], unconfirmedRouteIds: [] }} loading={false} selected={selected} onSelect={setSelected} onClose={() => setSelected(undefined)} />;
    }
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll });
    try {
      const container = await render(<Results />);
      const buttons = [...container.querySelectorAll<HTMLButtonElement>('.journey-result-row')];
      await act(async () => buttons[0].click());
      const first = buttons[0].closest('li')!;
      expect(first.querySelector('.itinerary-card')).not.toBeNull();
      expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
      expect(first.querySelector('.itinerary-timetable > ol')?.children).toHaveLength(4);
      const more = first.querySelector<HTMLDetailsElement>('.remaining-stops')!;
      expect(more.open).toBe(false);
      more.open = true;
      expect(more.querySelectorAll('li')).toHaveLength(3);
      expect(more.textContent).toContain('Fim · Destino');
      expect(more.querySelector('ol')?.start).toBe(5);
      expect(scroll).not.toHaveBeenCalled();
      await act(async () => buttons[1].click());
      expect(first.querySelector('.itinerary-card')).toBeNull();
      expect(buttons[1].closest('li')?.querySelector('.itinerary-card')).not.toBeNull();
      expect(buttons[1].closest('li')?.querySelector<HTMLDetailsElement>('.remaining-stops')?.open).toBe(false);
      await act(async () => buttons[1].click());
      expect(container.querySelector('.itinerary-card')).toBeNull();
    } finally { Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView"); }
  });
});
