import { mutate, read, id, now } from "@/lib/db.js";
import { hashPassword, setSession } from "@/lib/auth.js";
import { ok, fail, body, cleanEmail, validEmail } from "@/lib/api.js";
import { issueCode } from "@/lib/service.js";

export async function POST(req) {
  const b = await body(req);
  const name = String(b.name || "").trim().replace(/\s+/g, " ");
  const email = cleanEmail(b.email);
  const phone = String(b.phone || "").replace(/[^\d+]/g, "");
  const password = String(b.password || "");
  if (name.length < 2) return fail("Please enter your full name");
  if (!validEmail(email)) return fail("Please enter a valid email address");
  if (phone.replace(/\D/g, "").length < 7) return fail("Please enter a valid phone number");
  if (password.length < 8) return fail("Password must be at least 8 characters");
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return fail("Password needs at least one letter and one number");

  const existing = read().users.find((u) => u.email === email);
  if (existing && existing.emailVerified && existing.phoneVerified) return fail("An account with this email already exists. Please log in.", 409);

  const user = mutate((db) => {
    let u = db.users.find((x) => x.email === email);
    if (u) {
      Object.assign(u, { name, phone, passwordHash: hashPassword(password), emailVerified: false, phoneVerified: false });
    } else {
      u = { id: id("u_"), name, email, phone, passwordHash: hashPassword(password), emailVerified: false, phoneVerified: false, onboarded: false, bank: null, createdAt: now() };
      db.users.push(u);
    }
    issueCode(db, u, "email");
    return u;
  });
  await setSession(user.id, "email");
  return ok({ next: "/verify" });
}
