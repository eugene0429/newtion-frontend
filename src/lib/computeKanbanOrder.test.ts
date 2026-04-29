import { describe, it, expect } from "vitest";
import { computeKanbanOrder, KANBAN_ORDER_STEP } from "./computeKanbanOrder";

describe("computeKanbanOrder", () => {
  it("빈 배열이면 0", () => {
    expect(computeKanbanOrder([], 0)).toBe(0);
  });

  it("맨 앞에 끼우면 first - STEP", () => {
    expect(computeKanbanOrder([10, 20, 30], 0)).toBe(10 - KANBAN_ORDER_STEP);
  });

  it("맨 뒤에 끼우면 last + STEP", () => {
    expect(computeKanbanOrder([10, 20, 30], 3)).toBe(30 + KANBAN_ORDER_STEP);
  });

  it("중간에 끼우면 양 옆 midpoint", () => {
    expect(computeKanbanOrder([10, 20, 30], 1)).toBe(15);
    expect(computeKanbanOrder([10, 20, 30], 2)).toBe(25);
  });

  it("insertIndex 가 길이를 초과하면 끝으로 클램프", () => {
    expect(computeKanbanOrder([10, 20], 99)).toBe(20 + KANBAN_ORDER_STEP);
  });

  it("insertIndex 가 음수이면 앞으로 클램프", () => {
    expect(computeKanbanOrder([10, 20], -5)).toBe(10 - KANBAN_ORDER_STEP);
  });
});
