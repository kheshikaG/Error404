// The ONE status vocabulary for the whole app. Every badge comes from here, so
// "Pending approval" looks and reads the same on every screen.
// tone -> colour meaning (never decoration): info=blue, success=green, warning=amber, danger=red, neutral=grey
export const STATUS = {
  processing: { tone: "info", icon: "processing", label: "Processing", help: "AI is working on it." },
  needs_review: { tone: "warning", icon: "review", label: "Needs review", help: "Some details need a second look before it counts." },
  pending_approval: { tone: "warning", icon: "pending", label: "Pending approval", help: "Waiting for group members to approve. It doesn't affect balances yet." },
  confirmed: { tone: "success", icon: "confirmed", label: "Confirmed", help: "Approved and included in balances." },
  awaiting_payment: { tone: "warning", icon: "pending", label: "Awaiting payment", help: "This amount is still owed." },
  awaiting_confirmation: { tone: "warning", icon: "pending", label: "Awaiting confirmation", help: "Paid in cash - waiting for the receiver to confirm." },
  settled: { tone: "success", icon: "settled", label: "Settled", help: "Nothing is owed." },
  paid: { tone: "success", icon: "confirmed", label: "Payment confirmed", help: "The payment is recorded and balances are updated." },
  disputed: { tone: "danger", icon: "flag", label: "Disputed", help: "The receiver says the money didn't arrive." },
  rejected: { tone: "danger", icon: "error", label: "Not received", help: "The receiver said they didn't get this cash payment." },
  removed: { tone: "neutral", icon: "removed", label: "Removed", help: "This expense was removed and doesn't count." },
};

export function settlementStatus(s) {
  return { completed: "paid", pending_confirmation: "awaiting_confirmation", rejected: "rejected", disputed: "disputed" }[s] || s;
}

export function confidenceLevel(c) {
  if (c == null) return null;
  if (c >= 0.85) return { label: "High", tone: "success" };
  if (c >= 0.65) return { label: "Medium", tone: "warning" };
  return { label: "Low", tone: "warning" };
}
