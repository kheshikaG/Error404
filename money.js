// Money engine. Every amount is an integer number of cents, so shares always add up exactly.
// Safe to import from both the browser and the server.

export const CURRENCIES = {
  MUR: { symbol: "Rs", name: "Mauritian rupee" },
  USD: { symbol: "$", name: "US dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British pound" },
  INR: { symbol: "₹", name: "Indian rupee" },
  ZAR: { symbol: "R", name: "South African rand" },
};

export function toCents(value) {
  if (typeof value === "number") return Math.round(value * 100);
  const n = parseFloat(String(value || "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function fmt(cents, currency = "MUR") {
  const sym = CURRENCIES[currency]?.symbol ?? currency + " ";
  const neg = cents < 0;
  const v = Math.abs(cents) / 100;
  const s = v.toLocaleString("en-US", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return (neg ? "-" : "") + sym + " " + s;
}

// Split `total` cents by integer weights. Leftover cents go to the largest remainders,
// so the result always sums to exactly `total`.
export function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error("Nothing to split between");
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) floors[order[k].i]++;
  return floors;
}

/**
 * Work out each person's share.
 * method: equal | exact | percent | shares | itemized
 * details:
 *   exact    -> { amounts: { uid: cents } }
 *   percent  -> { percents: { uid: number } }       (must total 100)
 *   shares   -> { shares: { uid: number } }
 *   itemized -> { items: [{ name, amount(cents), people:[uid] }], extras: cents, extrasMode: "proportional"|"equal" }
 * Returns { shares: { uid: cents }, explanation: string[] }
 */
export function computeShares(total, method, participants, details = {}, names = {}) {
  const nm = (u) => names[u] || "Someone";
  const explanation = [];
  if (!Number.isInteger(total) || total <= 0) throw new Error("Amount must be more than zero");
  if (!participants?.length) throw new Error("Pick at least one person to split with");
  const shares = {};

  if (method === "equal") {
    const parts = allocate(total, participants.map(() => 1));
    participants.forEach((u, i) => (shares[u] = parts[i]));
    explanation.push(`Split equally between ${participants.length} ${participants.length === 1 ? "person" : "people"}.`);
    if (total % participants.length) explanation.push("Leftover cents were spread one at a time so the total matches exactly.");
  } else if (method === "exact") {
    const amounts = details.amounts || {};
    let sum = 0;
    for (const u of participants) {
      const a = Math.max(0, Math.round(amounts[u] || 0));
      shares[u] = a;
      sum += a;
    }
    if (sum !== total) throw new Error(`The amounts add up to ${fmt(sum)} but the bill is ${fmt(total)}`);
    explanation.push("Each person pays the exact amount entered.");
  } else if (method === "percent") {
    const p = details.percents || {};
    const sum = participants.reduce((a, u) => a + Number(p[u] || 0), 0);
    if (Math.abs(sum - 100) > 0.01) throw new Error(`Percentages add up to ${+sum.toFixed(2)}%, not 100%`);
    const parts = allocate(total, participants.map((u) => Math.round(Number(p[u] || 0) * 100)));
    participants.forEach((u, i) => (shares[u] = parts[i]));
    explanation.push("Split by percentage: " + participants.map((u) => `${nm(u)} ${+Number(p[u] || 0).toFixed(2)}%`).join(", ") + ".");
  } else if (method === "shares") {
    const s = details.shares || {};
    const w = participants.map((u) => Math.max(0, Number(s[u] ?? 1)));
    if (w.some((x) => !Number.isFinite(x))) throw new Error("Shares must be numbers");
    const parts = allocate(total, w.map((x) => Math.round(x * 100)));
    participants.forEach((u, i) => (shares[u] = parts[i]));
    explanation.push("Split by shares: " + participants.map((u, i) => `${nm(u)} ×${w[i]}`).join(", ") + ".");
  } else if (method === "itemized") {
    const items = details.items || [];
    if (!items.length) throw new Error("Add at least one item");
    const itemTotals = {};
    participants.forEach((u) => (itemTotals[u] = 0));
    let itemsSum = 0;
    for (const it of items) {
      const amt = Math.round(it.amount || 0);
      const people = (it.people || []).filter((u) => participants.includes(u));
      const who = people.length ? people : participants;
      const parts = allocate(amt, who.map(() => 1));
      who.forEach((u, i) => (itemTotals[u] += parts[i]));
      itemsSum += amt;
      explanation.push(`${it.name || "Item"} (${fmt(amt)}) → ${who.length === participants.length ? "everyone" : who.map(nm).join(" & ")}`);
    }
    const extras = total - itemsSum;
    if (extras < 0) throw new Error(`Items add up to ${fmt(itemsSum)}, which is more than the bill total ${fmt(total)}`);
    let extraParts;
    if (extras > 0) {
      if (details.extrasMode === "equal" || itemsSum === 0) {
        extraParts = allocate(extras, participants.map(() => 1));
        explanation.push(`Tax / service / tip of ${fmt(extras)} split equally.`);
      } else {
        extraParts = allocate(extras, participants.map((u) => itemTotals[u] || 0).map((x) => x || 0));
        explanation.push(`Tax / service / tip of ${fmt(extras)} split in proportion to what each person ordered.`);
      }
    } else extraParts = participants.map(() => 0);
    participants.forEach((u, i) => (shares[u] = itemTotals[u] + extraParts[i]));
  } else {
    throw new Error("Unknown split method");
  }

  for (const u of Object.keys(shares)) if (shares[u] === 0 && method !== "exact" && method !== "itemized") delete shares[u];
  return { shares, explanation };
}

// Net balance per user in a group. Positive = is owed money, negative = owes money.
export function groupBalances(memberIds, expenses, settlements) {
  const net = {};
  memberIds.forEach((u) => (net[u] = 0));
  for (const e of expenses) {
    // Only confirmed expenses move money. Pending / needs-review ones are shown separately.
    if (e.deleted || (e.status && e.status !== "confirmed")) continue;
    net[e.paidBy] = (net[e.paidBy] || 0) + e.amount;
    for (const [u, c] of Object.entries(e.shares)) net[u] = (net[u] || 0) - c;
  }
  for (const s of settlements) {
    if (s.status !== "completed") continue;
    net[s.fromUserId] = (net[s.fromUserId] || 0) + s.amount;
    net[s.toUserId] = (net[s.toUserId] || 0) - s.amount;
  }
  return net;
}

// Fewest-payments plan: repeatedly match the biggest debtor with the biggest creditor.
export function simplifyDebts(net) {
  const debtors = [];
  const creditors = [];
  for (const [u, v] of Object.entries(net)) {
    if (v < 0) debtors.push({ u, v: -v });
    else if (v > 0) creditors.push({ u, v });
  }
  const plan = [];
  debtors.sort((a, b) => b.v - a.v || a.u.localeCompare(b.u));
  creditors.sort((a, b) => b.v - a.v || a.u.localeCompare(b.u));
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v);
    if (amt > 0) plan.push({ from: debtors[i].u, to: creditors[j].u, amount: amt });
    debtors[i].v -= amt;
    creditors[j].v -= amt;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return plan;
}

// How many separate "A owes B" pairs there would be without simplification.
export function rawDebtCount(expenses) {
  const pair = {};
  for (const e of expenses) {
    if (e.deleted || (e.status && e.status !== "confirmed")) continue;
    for (const [u, c] of Object.entries(e.shares)) {
      if (u === e.paidBy || c <= 0) continue;
      const k = [u, e.paidBy].sort().join("|");
      const sign = u < e.paidBy ? 1 : -1;
      pair[k] = (pair[k] || 0) + sign * c;
    }
  }
  return Object.values(pair).filter((v) => v !== 0).length;
}
