import { mutate } from "@/lib/db.js";
import { ok, body, auth } from "@/lib/api.js";

export async function GET() {
  const { db, user, res } = await auth();
  if (res) return res;
  const mine = db.notifications.filter((n) => n.userId === user.id);
  const withStatus = mine.slice(0, 60).map((n) => {
    if (n.type === "cash_confirm" || n.type === "payment") {
      const s = db.settlements.find((x) => x.id === n.ref);
      return { ...n, settlement: s ? { id: s.id, status: s.status, method: s.method, amount: s.amount, currency: s.currency, proof: s.proof } : null };
    }
    if (n.type === "approval") {
      const e = db.expenses.find((x) => x.id === n.ref);
      if (e) return { ...n, expense: { id: e.id, status: e.deleted ? "removed" : e.status || "confirmed", canApprove: !e.deleted && e.status !== "confirmed" && [...new Set([...e.participants, e.paidBy])].includes(user.id) && !(e.approvals || []).includes(user.id) } };
    }
    return n;
  });
  return ok({ notifications: withStatus, unread: mine.filter((n) => !n.read).length });
}

export async function POST(req) {
  const { user, res } = await auth();
  if (res) return res;
  const b = await body(req);
  mutate((db) => {
    db.notifications.forEach((n) => {
      if (n.userId === user.id && (b.all || n.id === b.id)) n.read = true;
    });
  });
  return ok({});
}
