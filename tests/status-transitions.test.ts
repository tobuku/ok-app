/**
 * Job Status Transition Tests — Phase 1
 * Verifies the guarded status transition logic.
 */
import { describe, it, expect } from "vitest";
import { canTransition, assertTransition } from "../src/lib/status";

describe("Job Status Transitions", () => {
  // Valid forward flow
  it("NEW → SCHEDULED is valid", () => {
    expect(canTransition("NEW", "SCHEDULED")).toBe(true);
  });

  it("SCHEDULED → EN_ROUTE is valid", () => {
    expect(canTransition("SCHEDULED", "EN_ROUTE")).toBe(true);
  });

  it("EN_ROUTE → ON_SITE is valid", () => {
    expect(canTransition("EN_ROUTE", "ON_SITE")).toBe(true);
  });

  it("ON_SITE → QUOTED is valid", () => {
    expect(canTransition("ON_SITE", "QUOTED")).toBe(true);
  });

  it("QUOTED → ACCEPTED is valid", () => {
    expect(canTransition("QUOTED", "ACCEPTED")).toBe(true);
  });

  it("QUOTED → DECLINED is valid", () => {
    expect(canTransition("QUOTED", "DECLINED")).toBe(true);
  });

  it("DECLINED → QUOTED is valid (re-quote)", () => {
    expect(canTransition("DECLINED", "QUOTED")).toBe(true);
  });

  it("ACCEPTED → IN_PROGRESS is valid", () => {
    expect(canTransition("ACCEPTED", "IN_PROGRESS")).toBe(true);
  });

  it("IN_PROGRESS → COMPLETED is valid", () => {
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("COMPLETED → PAID is valid", () => {
    expect(canTransition("COMPLETED", "PAID")).toBe(true);
  });

  // Cancellation from any active status
  it("any active status can transition to CANCELED", () => {
    const cancelable = [
      "NEW", "SCHEDULED", "EN_ROUTE", "ON_SITE",
      "QUOTED", "ACCEPTED", "DECLINED", "IN_PROGRESS",
    ] as const;
    for (const s of cancelable) {
      expect(canTransition(s, "CANCELED")).toBe(true);
    }
  });

  // Terminal states
  it("PAID cannot transition anywhere", () => {
    expect(canTransition("PAID", "COMPLETED")).toBe(false);
    expect(canTransition("PAID", "CANCELED")).toBe(false);
  });

  it("CANCELED cannot transition anywhere", () => {
    expect(canTransition("CANCELED", "NEW")).toBe(false);
    expect(canTransition("CANCELED", "SCHEDULED")).toBe(false);
  });

  // Invalid skips
  it("cannot skip steps: NEW → ON_SITE", () => {
    expect(canTransition("NEW", "ON_SITE")).toBe(false);
  });

  it("cannot skip steps: SCHEDULED → COMPLETED", () => {
    expect(canTransition("SCHEDULED", "COMPLETED")).toBe(false);
  });

  it("cannot go backwards: ON_SITE → EN_ROUTE", () => {
    expect(canTransition("ON_SITE", "EN_ROUTE")).toBe(false);
  });

  it("cannot go backwards: COMPLETED → IN_PROGRESS", () => {
    expect(canTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
  });

  // assertTransition throws
  it("assertTransition throws on invalid transition", () => {
    expect(() => assertTransition("NEW", "PAID")).toThrow(
      "Invalid job status transition"
    );
  });

  it("assertTransition does not throw on valid transition", () => {
    expect(() => assertTransition("NEW", "SCHEDULED")).not.toThrow();
  });
});
