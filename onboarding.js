import { mutate } from "@/lib/db.js";
import { ok, fail, body, auth } from "@/lib/api.js";
import { bankFromInput } from "@/lib/bank.js";
import { notify } from "@/lib/notify.js";

export async function POST(req) {
  const { user, res } = await auth();
  if (res) return res;
  const b = await body(req);
  if (b.action === "skip") {
    mutate((db) => {
      const u = db.users.find((x) => x.id === user.id);
      u.onboarded = true;
      notify(db, u.id, { title: "Bank details skipped", body: "You can link a bank any time from Settings to top up or withdraw from your wallet.", link: "/settings" });
    });
    return ok({ next: "/dashboard" });
  }
  const { bank, error } = bankFromInput(b);
  if (error) return fail(error);
  mutate((db) => {
    const u = db.users.find((x) => x.id === user.id);
    u.bank = bank;
    u.onboarded = true;
    notify(db, u.id, { type: "wallet", title: `${bank.bankName} ••${bank.last4} linked`, body: "You can now add money to your wallet and withdraw it.", link: "/wallet" });
  });
  return ok({ next: "/dashboard" });
}
