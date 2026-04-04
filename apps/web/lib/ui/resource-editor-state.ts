import type { ResourceCounts, ResourceType } from "@siedler/shared-types";

export interface ResourceEditorConstraints {
  maxByResource?: Partial<ResourceCounts> | undefined;
  totalCap?: number | undefined;
}

export function nextResourceSelection(
  resources: ResourceCounts,
  type: ResourceType,
  delta: number,
  constraints?: ResourceEditorConstraints,
): ResourceCounts {
  const totalWithoutType = sumResourceCounts(resources) - resources[type];
  const maxByResource = constraints?.maxByResource?.[type] ?? Number.POSITIVE_INFINITY;
  const maxByTotal =
    constraints?.totalCap === undefined ? Number.POSITIVE_INFINITY : Math.max(0, constraints.totalCap - totalWithoutType);
  const nextCount = clamp(resources[type] + delta, 0, Math.min(maxByResource, maxByTotal));

  return {
    ...resources,
    [type]: nextCount,
  };
}

export function canIncrementResourceSelection(
  resources: ResourceCounts,
  type: ResourceType,
  constraints?: ResourceEditorConstraints,
): boolean {
  return nextResourceSelection(resources, type, 1, constraints)[type] !== resources[type];
}

export function clampResourceSelection(resources: ResourceCounts, constraints?: ResourceEditorConstraints): ResourceCounts {
  let next = { ...resources };

  for (const type of RESOURCE_TYPES) {
    next = nextResourceSelection(next, type, 0, constraints);
  }

  if (constraints?.totalCap !== undefined && sumResourceCounts(next) > constraints.totalCap) {
    const byCount = [...RESOURCE_TYPES].sort((left, right) => next[right] - next[left]);
    for (const type of byCount) {
      while (sumResourceCounts(next) > constraints.totalCap && next[type] > 0) {
        next = nextResourceSelection(next, type, -1, constraints);
      }
    }
  }

  return next;
}

function sumResourceCounts(resources: ResourceCounts): number {
  return RESOURCE_TYPES.reduce((sum, type) => sum + resources[type], 0);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

const RESOURCE_TYPES: ResourceType[] = ["wood", "brick", "sheep", "wheat", "ore"];
