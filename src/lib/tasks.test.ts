import { describe, expect, it } from "vitest";
import { dueDateKey } from "./tasks";

describe("dueDateKey", () => {
  it("takes the date as written, without converting timezones", () => {
    // Graph sends UTC midnight to mean a plain date; converting it would
    // shift the day backwards anywhere west of UTC.
    expect(dueDateKey("2026-07-20T00:00:00.0000000")).toBe("2026-07-20");
    expect(dueDateKey("2026-07-20T00:00:00Z")).toBe("2026-07-20");
  });

  it("ignores the time portion", () => {
    expect(dueDateKey("2026-07-20T23:59:00")).toBe("2026-07-20");
  });

  it("is null-safe", () => {
    expect(dueDateKey(null)).toBeNull();
  });
});
