// Steps shown on the customer's order timeline; "rejected" orders are shown separately as cancelled
export const ORDER_STEPS = [
   { status: "pending", label: "placed" },
   { status: "accepted", label: "accepted" },
   { status: "shipped", label: "shipped" },
   { status: "delivered", label: "delivered" },
] as const;

// Index of the last completed step for an order status (-1 when the status isn't on the timeline)
export function completedStep(status?: string) {
   return ORDER_STEPS.findIndex((step) => step.status === (status || "pending"));
}
