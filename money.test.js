import test from "node:test";
import assert from "node:assert/strict";
import { allocate, computeShares, groupBalances, simplifyDebts, toCents, fmt } from "../lib/money.js";

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

test("allocate always adds up exactly", () => {
  assert.deepEqual(allocate(1000, [1, 1, 1]), [334, 333, 333]);
  for (let t = 1; t < 500; t += 7) assert.equal(allocate(t, [3, 2, 7]).reduce((a, b) => a + b), t);
});

test("equal split with leftover cents", () => {
  const { shares } = computeShares(100000, "equal", ["a", "b", "c"]);
  assert.equal(sum(shares), 100000);
  assert.deepEqual(Object.values(shares).sort(), [33333, 33333, 33334]);
});

test("exact split must match the total", () => {
  assert.throws(() => computeShares(1000, "exact", ["a", "b"], { amounts: { a: 300, b: 600 } }));
  const { shares } = computeShares(1000, "exact", ["a", "b"], { amounts: { a: 400, b: 600 } });
  assert.deepEqual(shares, { a: 400, b: 600 });
});

test("percent split must total 100", () => {
  assert.throws(() => computeShares(1000, "percent", ["a", "b"], { percents: { a: 50, b: 40 } }));
  const { shares } = computeShares(99999, "percent", ["a", "b", "c"], { percents: { a: 50, b: 25, c: 25 } });
  assert.equal(sum(shares), 99999);
});

test("shares split", () => {
  const { shares } = computeShares(80000, "shares", ["r", "s", "a"], { shares: { r: 2, s: 1, a: 1 } });
  assert.deepEqual(shares, { r: 40000, s: 20000, a: 20000 });
});

test("itemized split with tax shared proportionally", () => {
  const items = [{ name: "Burger", amount: 45000, people: ["z"] }, { name: "Pizza", amount: 52000, people: ["a", "s"] }, { name: "Nachos", amount: 30000, people: [] }];
  const { shares } = computeShares(140000, "itemized", ["a", "s", "z"], { items, extrasMode: "proportional" });
  assert.equal(sum(shares), 140000);
  assert.ok(shares.z > 45000 && shares.a > 26000);
  assert.throws(() => computeShares(100000, "itemized", ["a"], { items }));
});

test("balances and simplification", () => {
  const exps = [
    { paidBy: "a", amount: 3000, shares: { a: 1000, b: 1000, c: 1000 } },
    { paidBy: "b", amount: 3000, shares: { a: 1000, b: 1000, c: 1000 } },
  ];
  const net = groupBalances(["a", "b", "c"], exps, [{ fromUserId: "c", toUserId: "a", amount: 500, status: "completed" }, { fromUserId: "c", toUserId: "b", amount: 999, status: "pending_confirmation" }]);
  assert.deepEqual(net, { a: 500, b: 1000, c: -1500 });
  const plan = simplifyDebts(net);
  assert.equal(plan.length, 2);
  assert.equal(plan.reduce((s, p) => s + p.amount, 0), 1500);
});

test("formatting", () => {
  assert.equal(toCents("1,250.50"), 125050);
  assert.equal(fmt(125000, "MUR"), "Rs 1,250");
  assert.equal(fmt(-50, "USD"), "-$ 0.50");
});
