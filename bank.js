import { mutate } from "@/lib/db.js";
import { ok, fail, body, auth } from "@/lib/api.js";
import { bankFromInput } from "@/lib/bank.js";

export async function POST(req) {
  const { user, res } = await auth();
  if (res) return res;
  const { bank, error } = bankFromInput(await body(req));
  if (error) return fail(error);
  mutate((db) => { db.users.find((x) => x.id === user.id).bank = bank; });
  return ok({ bank });
}

export async function DELETE() {
  const { user, res } = await auth();
  if (res) return res;
  mutate((db) => { db.users.find((x) => x.id === user.id).bank = null; });
  return ok({});
}
