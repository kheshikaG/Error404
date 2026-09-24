import { mutate } from "@/lib/db.js";
import { ok, fail, body, auth } from "@/lib/api.js";
import { fmt } from "@/lib/money.js";
import { notify } from "@/lib/notify.js";
import { wallet, walletTx, sharedGroup } from "@/lib/service.js";

// DEMO wallet: balances are simulated. No real money moves - there is no payment provider connected.
export async function GET() {
  const { db, user, res } = await auth();
  if (res) return res;
  const bal = db.wallets.find((w) => w.userId === user.id)?.balance || 0;
  const names = Object.fromEntries(db.users.map((u) => [u.id, u.name]));
  const contacts = db.users
    .filter((u) => u.id !== user.id && sharedGroup(db, user.id, u.id))
    .map((u) => ({ id: u.id, name: u.name }));
  return ok({
    balance: bal,
    bank: user.bank || null,
    tx: db.walletTx.filter((t) => t.userId === user.id).slice(0, 100).map((t) => ({ ...t, counterpartyName: names[t.counterpartyId] || null })),
    contacts,
  });
}

export async function POST(req) {
  const { db, user, res } = await auth();
  if (res) return res;
  const b = await body(req);
  const amount = Math.round(Number(b.amount));
  if (!Number.isInteger(amount) || amount <= 0) return fail("Enter an amount more than zero");
  const bal = db.wallets.find((w) => w.userId === user.id)?.balance || 0;
  const me = user.name.split(" ")[0];

  if (b.action === "topup") {
    if (!user.bank) return fail("Link a bank account first (Settings) to add money", 412);
    if (amount > 10000000) return fail("You can add up to Rs 100,000 at a time");
    const tx = mutate((d) => walletTx(d, user.id, "topup", amount, { note: `From ${user.bank.bankName} ••${user.bank.last4}` }));
    return ok({ balance: tx.balanceAfter });
  }
  if (b.action === "withdraw") {
    if (!user.bank) return fail("Link a bank account first (Settings) to withdraw", 412);
    if (amount > bal) return fail(`You only have ${fmt(bal)} in your wallet`);
    const tx = mutate((d) => walletTx(d, user.id, "withdraw", -amount, { note: `To ${user.bank.bankName} ••${user.bank.last4}` }));
    return ok({ balance: tx.balanceAfter });
  }
  if (b.action === "send") {
    const to = db.users.find((u) => u.id === b.toUserId);
    if (!to || to.id === user.id) return fail("Choose who to send money to");
    if (!sharedGroup(db, user.id, to.id)) return fail("You can only send money to people in your groups");
    if (amount > bal) return fail(`You only have ${fmt(bal)} in your wallet`);
    const note = String(b.note || "").slice(0, 80);
    const tx = mutate((d) => {
      const t = walletTx(d, user.id, "send", -amount, { counterpartyId: to.id, note: note || `To ${to.name.split(" ")[0]}` });
      walletTx(d, to.id, "receive", amount, { counterpartyId: user.id, note: note || `From ${me}` });
      notify(d, to.id, { type: "wallet", title: `${me} sent you ${fmt(amount)}`, body: note ? `"${note}"` : "It's in your SplitSmart wallet.", link: "/wallet" });
      return t;
    });
    return ok({ balance: tx.balanceAfter });
  }
  return fail("Unknown action");
}
