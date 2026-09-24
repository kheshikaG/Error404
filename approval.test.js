import test from "node:test";
import assert from "node:assert/strict";
import { voters, requiredApprovals, evaluate } from "../lib/approval.js";
import { groupBalances } from "../lib/money.js";

test("majority / all / none rules", () => {
  assert.equal(requiredApprovals("majority", 3), 2);
  assert.equal(requiredApprovals("majority", 4), 3);
  assert.equal(requiredApprovals("all", 4), 4);
  assert.equal(requiredApprovals("none", 4), 0);
});

test("voters include the payer", () => {
  assert.deepEqual(voters({ participants: ["b", "c"], paidBy: "a" }).sort(), ["a", "b", "c"]);
});

test("status follows approvals", () => {
  const e = { participants: ["a", "b", "c"], paidBy: "a", required: 2, approvals: ["a"] };
  assert.equal(evaluate(e), "pending_approval");
  e.approvals.push("b");
  assert.equal(evaluate(e), "confirmed");
  assert.equal(evaluate({ ...e, status: "needs_review" }), "needs_review");
});

test("pending expenses don't move balances", () => {
  const exps = [
    { paidBy: "a", amount: 900, shares: { a: 300, b: 300, c: 300 }, status: "confirmed" },
    { paidBy: "b", amount: 600, shares: { a: 300, b: 300 }, status: "pending_approval" },
  ];
  assert.deepEqual(groupBalances(["a", "b", "c"], exps, []), { a: 600, b: -300, c: -300 });
});
