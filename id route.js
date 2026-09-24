import { mutate } from "@/lib/db.js";
import { ok, fail, body, auth, isMember } from "@/lib/api.js";
import { groupView } from "@/lib/service.js";
import { RULES } from "@/lib/approval.js";
import { GROUP_ICONS } from "@/lib/icons-keys.js";

export async function GET(req, { params }) {
  const { id } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const g = db.groups.find((x) => x.id === id);
  if (!g) return fail("Group not found", 404);
  if (!isMember(g, user.id)) return fail("You're not a member of this group", 403);
  return ok({ group: groupView(db, g, user.id), me: user.id });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const g = db.groups.find((x) => x.id === id);
  if (!g || g.createdBy !== user.id) return fail("Only the group owner can change settings", 403);
  const b = await body(req);
  mutate((d) => {
    const gg = d.groups.find((x) => x.id === id);
    if (b.name && String(b.name).trim().length >= 2) gg.name = String(b.name).trim().slice(0, 50);
    if (GROUP_ICONS.includes(b.icon)) gg.icon = b.icon;
    if (RULES[b.approvalRule]) gg.approvalRule = b.approvalRule;
  });
  return ok({});
}
