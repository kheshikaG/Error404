import { ok, auth } from "@/lib/api.js";
import { overview } from "@/lib/service.js";

export async function GET() {
  const { db, user, res } = await auth();
  if (res) return res;
  const invites = db.notifications.filter((n) => n.userId === user.id && n.type === "invite" && !n.done);
  return ok({ ...overview(db, user.id), invites });
}
