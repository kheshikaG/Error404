import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { read } from "./db.js";

const COOKIE = "ss_session";
const SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-me";

function sign(data) {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function encodeSession(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return data + "." + sign(data);
}

export function decodeSession(token) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = sign(data);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

// stage: "email" | "phone" | "login" (still verifying) or "full" (signed in)
export async function setSession(uid, stage) {
  const days = stage === "full" ? 7 : 1;
  const token = encodeSession({ uid, stage, exp: Date.now() + days * 864e5 });
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: days * 86400 });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession() {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export async function currentUser(db = read()) {
  const s = await getSession();
  if (!s || s.stage !== "full") return null;
  return db.users.find((u) => u.id === s.uid) || null;
}

export const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compareSync(pw, hash);

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    emailVerified: u.emailVerified,
    phoneVerified: u.phoneVerified,
    onboarded: u.onboarded,
    bank: u.bank || null,
    createdAt: u.createdAt,
  };
}
