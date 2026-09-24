import { publicUser } from "@/lib/auth.js";
import { ok, auth } from "@/lib/api.js";
import { aiEnabled } from "@/lib/ai.js";

export async function GET() {
  const { db, user, res } = await auth();
  if (res) return res;
  const w = db.wallets.find((x) => x.userId === user.id);
  return ok({
    user: publicUser(user),
    wallet: w?.balance || 0,
    unread: db.notifications.filter((n) => n.userId === user.id && !n.read).length,
    aiMode: aiEnabled() ? "claude" : "built-in",
  });
}
