const orderStatusTransitions = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrderStatus(currentStatus, nextStatus) {
  return currentStatus === nextStatus
    || orderStatusTransitions[currentStatus]?.includes(nextStatus) === true;
}
