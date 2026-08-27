import { describe, expect, it } from "vitest";
import { isLocked } from "../src/lib/lock";

describe("tournament lock", () => {
  it("locks exactly at the configured instant", () => {
    const lock = "2026-08-30T15:00:00.000Z";
    expect(isLocked(lock, new Date("2026-08-30T14:59:59.999Z"))).toBe(false);
    expect(isLocked(lock, new Date(lock))).toBe(true);
  });
});
