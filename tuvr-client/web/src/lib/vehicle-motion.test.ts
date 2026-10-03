import { describe, expect, it } from "vitest";
import { isStalePosition, VehicleMotion, type MotionPosition } from "./vehicle-motion";

const initial: MotionPosition = { lat: 41.3, lon: -7.744 };
const east = (meters: number): MotionPosition => ({ lat: initial.lat, lon: initial.lon + meters / (111_000 * Math.cos(initial.lat * Math.PI / 180)) });

describe("animação de posições dos veículos", () => {
  it("não inicia um ciclo para coordenadas repetidas, com speed zero ou ausente", () => {
    for (const speed of [undefined, 0]) {
      const motion = new VehicleMotion(initial, 0);
      const vehicle = { position: initial, speed };
      motion.update(vehicle.position, 5_000);
      expect(motion.isAnimating).toBe(false);
      expect(motion.sample(20_000)).toEqual(initial);
    }
  });

  it("suprime apenas ruído submétrico e acumula movimento lento real", () => {
    const motion = new VehicleMotion(initial, 0);
    motion.update(east(0.6), 5_000);
    expect(motion.isAnimating).toBe(false);
    motion.update(east(1.2), 10_000);
    expect(motion.isAnimating).toBe(true);
  });

  it("continua uma nova transição da posição visual atual e termina exatamente no destino", () => {
    const motion = new VehicleMotion(initial, 0);
    const first = east(100), second = east(220);
    motion.update(first, 5_000);
    const visual = motion.sample(7_000);
    expect(visual.lon).toBeGreaterThan(initial.lon);
    expect(visual.lon).toBeLessThan(first.lon);
    motion.update(second, 7_000);
    expect(motion.position).toEqual(visual);
    expect(motion.sample(9_500)).toEqual(second);
    expect(motion.sample(12_000)).toEqual(second);
    expect(motion.isAnimating).toBe(false);
  });

  it("reposiciona sem animação em saltos grandes e posições antigas", () => {
    const jump = east(700);
    const motion = new VehicleMotion(initial, 0);
    motion.update(jump, 5_000);
    expect(motion.position).toEqual(jump);
    expect(motion.isAnimating).toBe(false);

    const freshMotion = new VehicleMotion(initial, 0);
    const next = east(100);
    freshMotion.update(next, 5_000, true);
    expect(freshMotion.position).toEqual(next);
    expect(freshMotion.isAnimating).toBe(false);
    expect(isStalePosition("2020-01-01T00:00:00Z", Date.now())).toBe(true);
    expect(isStalePosition(undefined, Date.now())).toBe(false);
  });

  it("suspende e salta o movimento acumulado em segundo plano; só anima após uma posição nova", () => {
    const motion = new VehicleMotion(initial, 0);
    const hiddenTarget = east(120), resumedTarget = east(250);
    motion.update(hiddenTarget, 5_000);
    motion.sample(6_000);
    expect(motion.setEnabled(false, 6_000)).toEqual(hiddenTarget);
    expect(motion.isAnimating).toBe(false);
    // An in-flight request can still finish after the page becomes hidden.
    motion.update(east(150), 59_000);
    motion.setEnabled(true, 60_000);
    expect(motion.sample(60_000)).toEqual(east(150));
    motion.update(resumedTarget, 65_000);
    expect(motion.position).toEqual(resumedTarget);
    expect(motion.isAnimating).toBe(false);
    expect(motion.sample(70_000)).toEqual(resumedTarget);
    motion.update(east(300), 70_000);
    expect(motion.isAnimating).toBe(true);
    expect(motion.sample(75_000)).toEqual(east(300));
  });

  it("anima normalmente depois de uma longa paragem com respostas regulares", () => {
    const motion = new VehicleMotion(initial, 0);
    for (let now = 5_000; now <= 120_000; now += 5_000) motion.update(initial, now);
    motion.update(east(20), 125_000);
    expect(motion.position).toEqual(initial);
    expect(motion.isAnimating).toBe(true);
    expect(motion.sample(127_500).lon).toBeCloseTo(east(10).lon, 8);
  });

  it("não interpreta códigos numéricos ou horas locais como timestamps", () => {
    expect(isStalePosition("1", Date.now())).toBe(false);
    expect(isStalePosition("2020-01-01T12:00:00", Date.now())).toBe(false);
    expect(isStalePosition("2020-01-01T12:00:00+01:00", Date.now())).toBe(true);
  });
});
