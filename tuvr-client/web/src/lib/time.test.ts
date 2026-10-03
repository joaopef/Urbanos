import { describe, expect, it } from "vitest";
import { formatServiceTime } from "./time";

describe("service times", () => {
  it("formats seconds since midnight", () => {
    expect(formatServiceTime(59400)).toBe("16:30");
    expect(formatServiceTime(86400)).toBe("00:00");
    expect(formatServiceTime(undefined)).toBeUndefined();
  });
});
