import { mutate, id, now } from "@/lib/db.js";
import { ok, fail, body, auth, isMember } from "@/lib/api.js";
import { computeShares, fmt } from "@/lib/money.js";
import { categorize } from "@/lib/parse.js";
import { notify } from "@/lib/notify.js";
import { voters, requiredApprovals, evaluate } from "@/lib/approval.js";

export async function POST(req, { params }) {
  const { id: gid } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const g = db.groups.find((x) => x.id === gid);
  if (!isMember(g, user.id)) return fail("You're not a member of this group", 403);
  const b = await body(req);
  const memberIds = g.members.map((m) => m.userId);
  const description = String(b.description || "").trim().slice(0, 60);
  const amount = Math.round(Number(b.amount));
  const paidBy = b.paidBy || user.id;
  const participants = (b.participants || []).filter((u) => memberIds.includes(u));
  const method = b.method || "equal";
  if (!description) return fail("Add a short description");
  if (!memberIds.includes(paidBy)) return fail("The payer must be in the group");
  const names = Object.fromEntries(db.users.map((u) => [u.id, u.name.split(" ")[0]]));
  let split;
  try {
    split = computeShares(amount, method, participants, b.details || {}, names);
  } catch (e) {
    return fail(e.message);
  }
  const cat = b.category ? { name: b.category, emoji: b.emoji || "🧾" } : categorize(description);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") ? b.date : new Date().toISOString().slice(0, 10);
  const expense = mutate((d) => {
    const e = {
      id: id("e_"),
      groupId: gid,
      description,
      category: cat.name,
      emoji: cat.emoji,
      amount,
      currency: g.currency,
      date,
      paidBy,
      participants,
      method,
      details: b.details || {},
      shares: split.shares,
      explanation: split.explanation,
      source: ["manual", "text", "voice", "receipt"].includes(b.source) ? b.source : "manual",
      aiNotes: Array.isArray(b.aiNotes) ? b.aiNotes.slice(0, 6) : [],
      aiConfidence: typeof b.aiConfidence === "number" ? b.aiConfidence : null,
      receipt: b.receipt ? { merchant: b.receipt.merchant || "", date: b.receipt.date || null, items: (b.receipt.items || []).slice(0, 60) } : null,
      createdBy: user.id,
      createdAt: now(),
      deleted: false,
      flags: [],
    };
    const v = voters(e);
    e.required = requiredApprovals(g.approvalRule || "majority", v.length);
    e.approvals = v.includes(user.id) ? [user.id] : [];
    e.status = evaluate(e);
    if (e.status === "confirmed") e.confirmedAt = now();
    d.expenses.push(e);
    for (const u of v) {
      if (u === user.id) continue;
      const share = split.shares[u] || 0;
      const needsMe = e.status !== "confirmed";
      notify(d, u, {
        type: needsMe ? "approval" : "expense",
        title: needsMe ? `Please review "${description}" in ${g.name}` : `${names[user.id]} added "${description}" in ${g.name}`,
        body: `${names[paidBy]} paid ${fmt(amount, g.currency)}. Your share is ${fmt(share, g.currency)}.${needsMe ? ` ${e.required} of ${v.length} approvals needed.` : ""}`,
        link: `/groups/${gid}`,
        ref: e.id,
      });
    }
    return e;
  });
  return ok({ expense });
}
