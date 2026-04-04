import { describe, expect, it } from "vitest";

import type { ResourceCounts } from "@siedler/shared-types";

import {
  canIncrementResourceSelection,
  clampResourceSelection,
  nextResourceSelection,
} from "../lib/ui/resource-editor-state";

const resources: ResourceCounts = {
  wood: 0,
  brick: 0,
  sheep: 0,
  wheat: 0,
  ore: 0,
};

describe("resource editor state", () => {
  it("caps discard selection by available cards and total discard count", () => {
    const constraints = {
      maxByResource: {
        wood: 1,
        sheep: 1,
        wheat: 3,
        ore: 3,
      },
      totalCap: 4,
    } as const;

    let next = nextResourceSelection(resources, "wheat", 1, constraints);
    next = nextResourceSelection(next, "ore", 1, constraints);
    next = nextResourceSelection(next, "ore", 1, constraints);
    next = nextResourceSelection(next, "sheep", 1, constraints);

    expect(next).toMatchObject({
      wheat: 1,
      ore: 2,
      sheep: 1,
    });
    expect(canIncrementResourceSelection(next, "wood", constraints)).toBe(false);
    expect(canIncrementResourceSelection(next, "ore", constraints)).toBe(false);
  });

  it("clamps stale selections back into legal bounds", () => {
    const clamped = clampResourceSelection(
      {
        wood: 2,
        brick: 0,
        sheep: 2,
        wheat: 2,
        ore: 0,
      },
      {
        maxByResource: {
          wood: 1,
          sheep: 1,
          wheat: 1,
        },
        totalCap: 2,
      },
    );

    expect(clamped.wood).toBeLessThanOrEqual(1);
    expect(clamped.sheep).toBeLessThanOrEqual(1);
    expect(clamped.wheat).toBeLessThanOrEqual(1);
    expect(clamped.wood + clamped.sheep + clamped.wheat + clamped.brick + clamped.ore).toBeLessThanOrEqual(2);
    expect(clamped.wood + clamped.sheep + clamped.wheat + clamped.brick + clamped.ore).toBeGreaterThan(0);
  });
});
