import { describe, expect, it } from "vitest";
import { getDirectionLabel, selectUpcomingStops } from "./vehicle";

const stop = (id: string, sequence: number, dueInMinutes?: number) => ({ id, name: id, sequence, dueInMinutes });

describe("getDirectionLabel", () => {
  it.each(["0", "1"])("uses the actual terminus instead of direction code %s", (code) => {
    expect(getDirectionLabel(code, [{ name: "LORDELO", sequence: 4 }, { name: "HOSPITAL", sequence: 1 }])).toBe("Sentido LORDELO");
  });
  it("preserves a descriptive direction and does not guess from unordered stops", () => {
    expect(getDirectionLabel("Sentido UTAD", [])).toBe("Sentido UTAD");
    expect(getDirectionLabel("1", [{ name: "HOSPITAL" }, { name: "LORDELO" }])).toBeUndefined();
    expect(getDirectionLabel("0", [])).toBeUndefined();
  });
});

describe("selectUpcomingStops", () => {
  it("excludes negative predictions and sequences already passed", () => {
    const result = selectUpcomingStops([stop("past", 1), stop("negative", 3, -2), stop("next", 4), stop("later", 5)], 2);
    expect(result.map((item) => item.id)).toEqual(["next", "later"]);
  });

  it("keeps a zero-minute prediction as the current arrival", () => {
    const result = selectUpcomingStops([stop("now", 1, 0), stop("next", 2, 5)], 1);
    expect(result.map((item) => item.id)).toEqual(["now", "next"]);
  });

  it("does not invent a sequence when the source omitted it", () => {
    const result = selectUpcomingStops([{ id: "unknown", name: "Unknown" }], 10);
    expect(result).toHaveLength(1);
  });
});
