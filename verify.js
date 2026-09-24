import { mutate } from "@/lib/db.js";
import { getSession, setSession } from "@/lib/auth.js";
import { ok, fail, body } from "@/lib/api.js";
import { checkCode, issueCode, deliverPendingInvites } from "@/lib/service.js";
import { notify } from "@/lib/notify.js";

export async function POST(req) {
  const s = await getSession();
  if (!s || s.stage === "full") return fail("Nothing to verify - please log in again", 401);
  const { code } = await body(req);
  if (!/^\d{6}$/.test(String(code || "").trim())) return fail("Enter the 6-digit code");

  const result = mutate((db) => {
    const u = db.users.find((x) => x.id === s.uid);
    if (!u) return { error: "Account not found" };
    const err = checkCode(db, u.id, s.stage, code);
    if (err) return { error: err };
    if (s.stage === "email") {
      u.emailVerified = true;
      issueCode(db, u, "phone");
      return { stage: "phone" };
    }
    if (s.stage === "phone") {
      const first = !u.phoneVerified;
      u.phoneVerified = true;
      if (first) {
        notify(db, u.id, { title: `Welcome to SplitSmart AI, ${u.name.split(" ")[0]}!`, body: "Create a group or join one with a code to start splitting." });
        deliverPendingInvites(db, u);
      }
      return { stage: "full", onboarded: u.onboarded };
    }
    deliverPendingInvites(db, u);
    return { stage: "full", onboarded: u.onboarded };
  });
  if (result.error) return fail(result.error);
  await setSession(s.uid, result.stage);
  if (result.stage === "phone") return ok({ next: "/verify", stage: "phone" });
  return ok({ next: result.onboarded ? "/dashboard" : "/onboarding", stage: "full" });
}
