import { mutate, id, now } from "@/lib/db.js";
import { ok, fail, body, auth, isMember } from "@/lib/api.js";
import { fmt } from "@/lib/money.js";
import { notify, sendSms } from "@/lib/notify.js";
import { wallet, walletTx } from "@/lib/service.js";
import { saveDataUrl } from "@/lib/uploads.js";

/**
 * Pay someone in a group.
 *  method "wallet" -> money moves wallet to wallet instantly, debt settled.
 *  method "bank"   -> already paid by bank transfer; proof of payment is required.
 *  method "cash"   -> already paid in cash; the person who received it must confirm.
 */
export async function POST(req) {
  const { db, user, res } = await auth();
  if (res) return res;
  const b = await body(req);
  const g = db.groups.find((x) => x.id === b.groupId);
  if (!isMember(g, user.id)) return fail("Not a member of this group", 403);
  const to = db.users.find((u) => u.id === b.toUserId);
  if (!to || !isMember(g, to.id) || to.id === user.id) return fail("Choose who you're paying");
  const amount = Math.round(Number(b.amount));
  if (!Number.isInteger(amount) || amount <= 0) return fail("Enter an amount more than zero");
  const method = b.method;
  if (!["wallet", "bank", "cash"].includes(method)) return fail("Choose how you paid");
  const cur = g.currency;
  const me = user.name.split(" ")[0];

  if (method === "wallet") {
    const bal = db.wallets.find((w) => w.userId === user.id)?.balance || 0;
    if (bal < amount) return fail(`Not enough in your wallet (${fmt(bal, cur)}). Add money first.`, 402);
  }
  let proof = null;
  if (method === "bank") {
    if (!b.proof) return fail("Please upload a screenshot or PDF of the bank transfer");
    const saved = saveDataUrl(b.proof);
    if (saved.error) return fail(saved.error);
    proof = saved.name;
  }

  const s = mutate((d) => {
    const st = {
      id: id("s_"),
      groupId: g.id,
      fromUserId: user.id,
      toUserId: to.id,
      amount,
      currency: cur,
      method,
      status: method === "cash" ? "pending_confirmation" : "completed",
      proof,
      reference: String(b.reference || "").slice(0, 60),
      note: String(b.note || "").slice(0, 120),
      createdAt: now(),
      confirmedAt: method === "cash" ? null : now(),
    };
    d.settlements.push(st);
    if (method === "wallet") {
      walletTx(d, user.id, "pay", -amount, { counterpartyId: to.id, groupId: g.id, note: `Paid ${to.name.split(" ")[0]} · ${g.name}` });
      walletTx(d, to.id, "receive_payment", amount, { counterpartyId: user.id, groupId: g.id, note: `From ${me} · ${g.name}` });
      notify(d, to.id, { type: "payment", title: `${me} paid you ${fmt(amount, cur)}`, body: `Paid from their SplitSmart wallet for ${g.name}. It's in your wallet now.`, link: "/wallet" });
    } else if (method === "bank") {
      notify(d, to.id, { type: "payment", title: `${me} paid you ${fmt(amount, cur)} by bank transfer`, body: `Proof of payment uploaded for ${g.name}. Tap to view it - you can dispute it if the money didn't arrive.`, link: `/groups/${g.id}?tab=payments`, ref: st.id });
    } else {
      notify(d, to.id, { type: "cash_confirm", title: `Did ${me} give you ${fmt(amount, cur)} in cash?`, body: `${me} says they paid you in cash for ${g.name}. Please confirm so it's marked as paid.`, link: `/groups/${g.id}?tab=payments`, ref: st.id });
      sendSms(d, { to: to.phone, text: `SplitSmart AI: ${user.name} says they paid you ${fmt(amount, cur)} in cash (${g.name}). Open the app to confirm.` });
    }
    return st;
  });
  return ok({ settlement: s });
}
