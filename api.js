import { NextResponse } from "next/server";
import { read } from "./db.js";
import { currentUser } from "./auth.js";

export const ok = (data = {}, status = 200) => NextResponse.json(data, { status });
export const fail = (error, status = 400) => NextResponse.json({ error }, { status });

export async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

// Returns { db, user } or a 401 response.
export async function auth() {
  const db = read();
  const user = await currentUser(db);
  if (!user) return { res: fail("Please sign in", 401) };
  return { db, user };
}

export function isMember(group, uid) {
  return group && group.members.some((m) => m.userId === uid);
}

export const cleanEmail = (e) => String(e || "").trim().toLowerCase();
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
