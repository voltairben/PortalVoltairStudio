import { describe, expect, it } from "vitest";
import type { Milestone } from "@/types";
import { milestoneStats } from "./milestone-progress";

const m = (status: Milestone["status"]): Milestone =>
  ({ id: "x", title: "x", status, order: 0 }) as Milestone;

describe("milestoneStats", () => {
  it("counts completed milestones and a rounded percentage", () => {
    expect(milestoneStats([m("complete"), m("complete"), m("active")])).toEqual({
      total: 3,
      done: 2,
      pct: 67,
    });
  });

  it("is 0% for an empty list", () => {
    expect(milestoneStats([])).toEqual({ total: 0, done: 0, pct: 0 });
  });
});
