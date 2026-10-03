// @vitest-environment jsdom
import { act, Profiler } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { TransitMap } from "./transit-map";

const marker = vi.hoisted(() => ({ setLatLng: vi.fn() }));
vi.mock("react-leaflet", async () => {
  const React = await import("react");
  const Container = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    MapContainer: Container, Popup: Container,
    Marker: React.forwardRef((_props, ref) => { React.useImperativeHandle(ref, () => marker); return null; }),
    Polyline: () => null, TileLayer: () => null, Tooltip: Container, ZoomControl: () => null,
    useMap: () => ({ invalidateSize: () => undefined }),
  };
});
let root: Root | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; document.body.innerHTML = ""; vi.restoreAllMocks(); vi.unstubAllGlobals(); marker.setLatLng.mockClear(); });

it("atualiza o Leaflet sem commits React por frame e cancela o ciclo quando termina ou desmonta", () => {
  let now = 0, nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const commits = vi.fn();
  const view = (lon: number, updatedAt: number) => <Profiler id="map" onRender={commits}><TransitMap vehicles={[{ id: "bus", position: { lat: 41.3, lon } }]} positionsUpdatedAt={updatedAt} stops={[]} plannerMode={false} onSelectVehicle={() => undefined} onSelectStop={() => undefined} /></Profiler>;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const rendered = { rerender: (element: React.ReactNode) => act(() => root!.render(element)), unmount: () => { act(() => root!.unmount()); root = undefined; } };
  rendered.rerender(view(-7.744, 1));
  expect(frames.size).toBe(0);
  now = 5_000;
  rendered.rerender(view(-7.743, 2));
  expect(frames.size).toBe(1);
  commits.mockClear();
  marker.setLatLng.mockClear();
  for (now = 5_020; now <= 10_000; now += 20) {
    act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach((frame) => frame(now)); });
  }
  expect(marker.setLatLng).toHaveBeenCalledTimes(250);
  expect(marker.setLatLng).toHaveBeenLastCalledWith([41.3, -7.743]);
  expect(commits).not.toHaveBeenCalled();
  expect(frames.size).toBe(0);
  now = 15_000;
  rendered.rerender(view(-7.743, 3));
  expect(frames.size).toBe(0);
  now = 20_000;
  rendered.rerender(view(-7.742, 4));
  expect(frames.size).toBe(1);
  rendered.unmount();
  expect(frames.size).toBe(0);
});
