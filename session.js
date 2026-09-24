import { read } from "@/lib/db.js";
import { getSession } from "@/lib/auth.js";
import { ok, fail } from "@/lib/api.js";

const maskEmail = (e) => e.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 6)) + c);
const maskPhone = (p) => p.slice(0, 4) + " •••• " + p.slice(-3);

// Used by the verification screen to know which step we're on.
export async function GET() {
  const s = await getSession();
  if (!s) return fail("No session", 401);
  const db = read();
  const u = db.users.find((x) => x.id === s.uid);
  if (!u) return fail("No session", 401);
  const otp = db.otps.find((o) => o.userId === u.id && o.purpose === s.stage);
  return ok({
    stage: s.stage,
    email: maskEmail(u.email),
    phone: maskPhone(u.phone),
    name: u.name.split(" ")[0],
    demoCode: otp?.demoCode || null,
    onboarded: u.onboarded,
  });
}
