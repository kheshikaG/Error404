import { clearSession } from "@/lib/auth.js";
import { ok } from "@/lib/api.js";

export async function POST() {
  await clearSession();
  return ok({});
}
