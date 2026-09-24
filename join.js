import { mutate } from "@/lib/db.js";
import { ok, fail, body, auth } from "@/lib/api.js";
import { addMember } from "@/lib/service.js";

// Look up a group by code (GET ?code=) or join it (POST { code }).
export async function GET(req) {
  const { db, user, res } = await auth();
  if (res) return res;
  const code = String(new URL(req.url).searchParams.get("code") || "").trim().toUpperCase();
  const g = db.groups.find((x) => x.code === code);
  if (!g) return fail("No group found with that code", 404);
  return ok({ group: { id: g.id, name: g.name, icon: g.icon || "users", memberCount: g.members.length }, already: g.members.some((m) => m.userId === user.id) });
}

export async function POST(req) {
  const { db, user, res } = await auth();
  if (res) return res;
  const code = String((await body(req)).code || "").trim().toUpperCase();
  const g = db.groups.find((x) => x.code === code);
  if (!g) return fail("No group found with that code. Check the 6 characters and try again.", 404);
  mutate((d) => addMember(d, d.groups.find((x) => x.id === g.id), d.users.find((u) => u.id === user.id), "code"));
  return ok({ groupId: g.id });
}
