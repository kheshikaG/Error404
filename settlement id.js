import { mutate, now } from "@/lib/db.js";
import { ok, fail, body, auth } from "@/lib/api.js";
import { fmt } from "@/lib/money.js";
import { notify } from "@/lib/notify.js";

// The person who RECEIVED the money confirms a cash payment, rejects it, or disputes a bank payment.
export async function POST(req, { params }) {
  const { id } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const s = db.settlements.find((x) => x.id === id);
  if (!s) return fail("Payment not found", 404);
  if (s.toUserId !== user.id) return fail("Only the person who received the money can do this", 403);
  const { action } = await body(req);
  const g = db.groups.find((x) => x.id === s.groupId);
  const me = user.name.split(" ")[0];
  const amt = fmt(s.amount, s.currency);

  if (action === "confirm") {
    if (s.status !== "pending_confirmation") return fail("This payment is already " + s.status.replace("_", " "));
    mutate((d) => {
      const x = d.settlements.find((y) => y.id === id);
      x.status = "completed";
      x.confirmedAt = now();
      d.notifications.forEach((n) => { if (n.ref === id && n.type === "cash_confirm") n.done = true; });
      notify(d, x.fromUserId, { type: "payment", title: `${me} confirmed your ${amt} cash payment`, body: `It's now marked as paid in ${g.name}.`, link: `/groups/${g.id}` });
    });
    return ok({ status: "completed" });
  }
  if (action === "reject" || action === "dispute") {
    if (action === "reject" && s.status !== "pending_confirmation") return fail("This payment can't be rejected now");
    if (action === "dispute" && !(s.method === "bank" && s.status === "completed")) return fail("Only bank payments can be disputed");
    mutate((d) => {
      const x = d.settlements.find((y) => y.id === id);
      x.status = action === "reject" ? "rejected" : "disputed";
      x.resolvedAt = now();
      d.notifications.forEach((n) => { if (n.ref === id) n.done = true; });
      notify(d, x.fromUserId, {
        type: "payment",
        title: action === "reject" ? `${me} says they didn't receive ${amt} in cash` : `${me} disputed your ${amt} bank payment`,
        body: `The amount is still owed in ${g.name}. Talk to ${me} and try again.`,
        link: `/groups/${g.id}`,
      });
    });
    return ok({ status: action === "reject" ? "rejected" : "disputed" });
  }
  return fail("Unknown action");
}
