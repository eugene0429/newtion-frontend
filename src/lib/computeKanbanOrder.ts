export const KANBAN_ORDER_STEP = 1000;

export function computeKanbanOrder(
  sortedOrders: number[],
  insertIndex: number,
): number {
  if (sortedOrders.length === 0) return 0;
  const idx = Math.max(0, Math.min(insertIndex, sortedOrders.length));
  if (idx === 0) return sortedOrders[0] - KANBAN_ORDER_STEP;
  if (idx === sortedOrders.length) {
    return sortedOrders[sortedOrders.length - 1] + KANBAN_ORDER_STEP;
  }
  return (sortedOrders[idx - 1] + sortedOrders[idx]) / 2;
}
