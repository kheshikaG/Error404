import { mutate, read } from "@/lib/db.js";
import { checkPassword, setSession } from "@/lib/auth.js";
import { ok, fail, body, cleanEmail } from "@/lib/api.js";
import { issueCode } from "@/lib/service.js";

export async function POST(req) {
  const b = await body(req);
  const email = cleanEmail(b.email);
  const user = read().users.find((u) => u.email === email);
  if (!user || !checkPassword(String(b.password || ""), user.passwordHash)) return fail("Email or password is incorrect", 401);
  const stage = !user.emailVerified ? "email" : !user.phoneVerified ? "phone" : "login";
  mutate((db) => issueCode(db, db.users.find((u) => u.id === user.id), stage));
  await setSession(user.id, stage);
  return ok({ next: "/verify" });
}
