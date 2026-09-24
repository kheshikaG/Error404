import { mutate, id, now, groupCode } from "@/lib/db.js";
import { ok, fail, body, auth, cleanEmail, validEmail } from "@/lib/api.js";
import { CURRENCIES } from "@/lib/money.js";
import { RULES } from "@/lib/approval.js";
import { GROUP_ICONS } from "@/lib/icons-keys.js";
import { groupSummary, createInvite } from "@/lib/service.js";

export async function GET() {
  const { db, user, res } = await auth();
  if (res) return res;
  const groups = db.groups
    .filter((g) => g.members.some((m) => m.userId === user.id))
    .map((g) => groupSummary(db, g, user.id))
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  const invites = db.notifications.filter((n) => n.userId === user.id && n.type === "invite" && !n.done);
  return ok({ groups, invites });
}

// Create a group. `members` is a list of { name, email } - there is no limit on how many.
export async function POST(req) {
  const { user, res } = await auth();
  if (res) return res;
  const b = await body(req);
  const name = String(b.name || "").trim();
  if (name.length < 2) return fail("Give your group a name");
  const currency = CURRENCIES[b.currency] ? b.currency : process.env.DEFAULT_CURRENCY || "MUR";
  const members = Array.isArray(b.members) ? b.members : [];
  const seen = new Set([user.email]);
  const clean = [];
  for (const m of members) {
    const email = cleanEmail(m.email);
    const mname = String(m.name || "").trim();
    if (!email && !mname) continue;
    if (!validEmail(email)) return fail(`"${m.email || mname}" isn't a valid email address`);
    if (!mname) return fail(`Add a name for ${email}`);
    if (seen.has(email)) continue;
    seen.add(email);
    clean.push({ name: mname, email });
  }
  const group = mutate((db) => {
    let code = groupCode();
    while (db.groups.some((g) => g.code === code)) code = groupCode();
    const g = {
      id: id("g_"),
      name: name.slice(0, 50),
      icon: GROUP_ICONS.includes(b.icon) ? b.icon : "users",
      approvalRule: RULES[b.approvalRule] ? b.approvalRule : "majority",
      currency,
      code,
      createdBy: user.id,
      createdAt: now(),
      members: [{ userId: user.id, role: "owner", joinedAt: now(), via: "created" }],
    };
    db.groups.push(g);
    for (const m of clean) createInvite(db, g, user, m.name, m.email);
    return g;
  });
  return ok({ group: { id: group.id, code: group.code }, invited: clean.length });
}
