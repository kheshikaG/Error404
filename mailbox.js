import { read } from "@/lib/db.js";
import { ok } from "@/lib/api.js";

// DEMO ONLY: shows every simulated email/SMS so you can present the invite and
// verification flow without a real email provider. Remove before going live.
export async function GET() {
  const db = read();
  return ok({ mail: db.mailbox.slice(0, 150) });
}
