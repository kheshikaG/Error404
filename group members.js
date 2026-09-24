import { mutate } from "@/lib/db.js";
import { ok, fail, body, auth, isMember, cleanEmail, validEmail } from "@/lib/api.js";
import { createInvite } from "@/lib/service.js";

// Invite someone by name + email. They get an email (demo mailbox) and an in-app invite.
export async function POST(req, { params }) {
  const { id } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const g = db.groups.find((x) => x.id === id);
  if (!isMember(g, user.id)) return fail("You're not a member of this group", 403);
  const b = await body(req);
  const email = cleanEmail(b.email);
  const name = String(b.name || "").trim();
  if (name.length < 1) return fail("Enter their name");
  if (!validEmail(email)) return fail("Enter a valid email address");
  const existing = db.users.find((u) => u.email === email);
  if (existing && isMember(g, existing.id)) return fail(`${existing.name} is already in this group`);
  mutate((d) => createInvite(d, d.groups.find((x) => x.id === id), user, name, email));
  return ok({ invited: email });
}
