import { mutate } from "@/lib/db.js";
import { getSession } from "@/lib/auth.js";
import { ok, fail } from "@/lib/api.js";
import { issueCode } from "@/lib/service.js";

export async function POST() {
  const s = await getSession();
  if (!s || s.stage === "full") return fail("Please log in again", 401);
  mutate((db) => {
    const u = db.users.find((x) => x.id === s.uid);
    if (u) issueCode(db, u, s.stage);
  });
  return ok({ sent: true });
}
