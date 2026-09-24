import { mutate, now } from "@/lib/db.js";
import { ok, fail, body, auth } from "@/lib/api.js";
import { fmt } from "@/lib/money.js";
import { notify } from "@/lib/notify.js";
import { voters, evaluate } from "@/lib/approval.js";

// approve | flag | resubmit
export async function POST(req, { params }) {
  const { id } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const e = db.expenses.find((x) => x.id === id);
  if (!e || e.deleted) return fail("Expense not found", 404);
  const g = db.groups.find((x) => x.id === e.groupId);
  if (!g.members.some((m) => m.userId === user.id)) return fail("You're not in this group", 403);
  const b = await body(req);
  const v = voters(e);
  const me = user.name.split(" ")[0];

  if (b.action === "approve") {
    if (!v.includes(user.id)) return fail("Only people involved in this expense can approve it", 403);
    if ((e.approvals || []).includes(user.id) && e.status !== "needs_review") return fail("You've already approved this");
    const status = mutate((d) => {
      const x = d.expenses.find((y) => y.id === id);
      x.approvals = [...new Set([...(x.approvals || []), user.id])];
      if (x.status === "needs_review") x.status = "pending_approval";
      const before = x.status;
      x.status = evaluate(x);
      d.notifications.forEach((n) => { if (n.userId === user.id && n.ref === id && n.type === "approval") n.done = true; });
      if (x.status === "confirmed" && before !== "confirmed") {
        x.confirmedAt = now();
        for (const u of v) notify(d, u, { type: "expense", title: `"${x.description}" is confirmed`, body: `${x.approvals.length} of ${v.length} people approved. Balances in ${g.name} are updated.`, link: `/groups/${g.id}`, ref: id });
      }
      return x.status;
    });
    return ok({ status });
  }

  if (b.action === "flag") {
    if (!v.includes(user.id)) return fail("Only people involved in this expense can flag it", 403);
    const reason = String(b.reason || "").trim().slice(0, 140) || "Something doesn't look right";
    mutate((d) => {
      const x = d.expenses.find((y) => y.id === id);
      x.status = "needs_review";
      x.approvals = [];
      x.flags = [...(x.flags || []), { by: user.id, reason, at: now() }];
      d.notifications.forEach((n) => { if (n.ref === id && n.type === "approval") n.done = true; });
      for (const u of new Set([x.createdBy, x.paidBy])) {
        if (u !== user.id) notify(d, u, { type: "approval", title: `${me} flagged "${x.description}" for review`, body: `"${reason}". Check the details and resubmit it for approval.`, link: `/groups/${g.id}`, ref: id });
      }
    });
    return ok({ status: "needs_review" });
  }

  if (b.action === "resubmit") {
    if (e.status !== "needs_review") return fail("Only expenses that need review can be resubmitted");
    if (e.createdBy !== user.id && e.paidBy !== user.id) return fail("Only the person who added or paid for this can resubmit it", 403);
    const status = mutate((d) => {
      const x = d.expenses.find((y) => y.id === id);
      x.status = "pending_approval";
      x.approvals = v.includes(user.id) ? [user.id] : [];
      x.status = evaluate(x);
      if (x.status === "confirmed") x.confirmedAt = now();
      for (const u of v) if (u !== user.id) notify(d, u, { type: "approval", title: `Please review "${x.description}" again`, body: `${me} checked it after it was flagged. ${fmt(x.amount, x.currency)} in ${g.name}.`, link: `/groups/${g.id}`, ref: id });
      return x.status;
    });
    return ok({ status });
  }
  return fail("Unknown action");
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const e = db.expenses.find((x) => x.id === id);
  if (!e) return fail("Expense not found", 404);
  const g = db.groups.find((x) => x.id === e.groupId);
  if (e.createdBy !== user.id && e.paidBy !== user.id && g.createdBy !== user.id) return fail("Only the person who added it, the payer or the group owner can remove this", 403);
  mutate((d) => {
    const x = d.expenses.find((y) => y.id === id);
    x.deleted = true;
    x.deletedBy = user.id;
    x.deletedAt = now();
    d.notifications.forEach((n) => { if (n.ref === id && n.type === "approval") n.done = true; });
  });
  return ok({});
}
