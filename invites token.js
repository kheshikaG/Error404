import { mutate, read } from "@/lib/db.js";
import { currentUser } from "@/lib/auth.js";
import { ok, fail, body } from "@/lib/api.js";
import { addMember, userName } from "@/lib/service.js";

// Public: anyone with the link can see who invited them (so they can sign up first).
export async function GET(req, { params }) {
  const { token } = await params;
  const db = read();
  const inv = db.invites.find((i) => i.token === token);
  if (!inv) return fail("This invite link isn't valid", 404);
  const g = db.groups.find((x) => x.id === inv.groupId);
  const me = await currentUser(db);
  return ok({
    invite: { name: inv.name, email: inv.email, status: inv.status, invitedBy: userName(db, inv.invitedBy) },
    group: { id: g.id, name: g.name, icon: g.icon || "users", memberCount: g.members.length, members: g.members.map((m) => userName(db, m.userId).split(" ")[0]) },
    me: me ? { email: me.email, name: me.name, member: g.members.some((m) => m.userId === me.id) } : null,
  });
}

export async function POST(req, { params }) {
  const { token } = await params;
  const db = read();
  const me = await currentUser(db);
  if (!me) return fail("Please sign in first", 401);
  const inv = db.invites.find((i) => i.token === token);
  if (!inv) return fail("This invite link isn't valid", 404);
  const { action } = await body(req);
  if (action === "decline") {
    mutate((d) => {
      const i = d.invites.find((x) => x.token === token);
      if (i.email === me.email) i.status = "declined";
      d.notifications.forEach((n) => { if (n.userId === me.id && n.type === "invite" && n.ref === i.groupId) n.done = true; });
    });
    return ok({ declined: true });
  }
  mutate((d) => addMember(d, d.groups.find((x) => x.id === inv.groupId), d.users.find((u) => u.id === me.id), "invite"));
  return ok({ groupId: inv.groupId });
}
