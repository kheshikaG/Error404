import { ok, fail, body, auth, isMember } from "@/lib/api.js";
import { analyseText } from "@/lib/ai.js";

// "AI, understand this": turns a typed or spoken sentence into a ready-to-review expense.
export async function POST(req) {
  const { db, user, res } = await auth();
  if (res) return res;
  const b = await body(req);
  const g = db.groups.find((x) => x.id === b.groupId);
  if (!isMember(g, user.id)) return fail("Not a member", 403);
  const text = String(b.text || "").trim();
  if (text.length < 3) return fail("Say or type what the expense was");
  const members = g.members.map((m) => ({ id: m.userId, name: db.users.find((u) => u.id === m.userId)?.name || "?" }));
  const proposal = await analyseText(text.slice(0, 500), members, user.id, g.currency);

  // Friendly warnings
  const warnings = [];
  const dayAgo = Date.now() - 864e5;
  const dup = db.expenses.find((e) => e.groupId === g.id && !e.deleted && e.amount === proposal.amount && Date.parse(e.createdAt) > dayAgo);
  if (dup) warnings.push(`Looks similar to "${dup.description}" added in the last 24 hours - make sure it isn't a duplicate.`);
  const live = db.expenses.filter((e) => e.groupId === g.id && !e.deleted);
  if (live.length >= 3) {
    const avg = live.reduce((s, e) => s + e.amount, 0) / live.length;
    if (proposal.amount > avg * 4) warnings.push("This is much bigger than this group's usual expenses - double-check the amount.");
  }
  return ok({ proposal, warnings });
}
