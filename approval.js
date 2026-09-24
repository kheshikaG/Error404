// Expense approval rules. Deterministic and shared by server + UI.
//   rule "majority" -> more than half of the people involved must approve (default)
//   rule "all"      -> everyone involved must approve
//   rule "none"     -> confirmed as soon as it's added
export const RULES = {
  majority: "Majority of the people involved",
  all: "Everyone involved",
  none: "No approval needed",
};

export function voters(e) {
  return [...new Set([...(e.participants || []), e.paidBy])];
}

export function requiredApprovals(rule, n) {
  if (rule === "none") return 0;
  if (rule === "all") return n;
  return Math.floor(n / 2) + 1;
}

// Returns the status an expense should have given its approvals.
export function evaluate(e) {
  if (e.status === "needs_review") return "needs_review";
  const v = voters(e);
  const got = (e.approvals || []).filter((u) => v.includes(u)).length;
  return got >= (e.required || 0) ? "confirmed" : "pending_approval";
}
