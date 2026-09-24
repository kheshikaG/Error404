import fs from "fs";
import path from "path";
import { auth, fail } from "@/lib/api.js";

const TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif", heic: "image/heic", pdf: "application/pdf" };

export async function GET(req, { params }) {
  const { name } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  if (!/^proof_[a-f0-9]+\.(png|jpg|webp|gif|heic|pdf)$/.test(name)) return fail("Not found", 404);
  const s = db.settlements.find((x) => x.proof === name);
  const g = s && db.groups.find((x) => x.id === s.groupId);
  if (!g || !g.members.some((m) => m.userId === user.id)) return fail("Not allowed", 403);
  const file = path.join(process.cwd(), "data", "uploads", name);
  if (!fs.existsSync(file)) return fail("Not found", 404);
  return new Response(fs.readFileSync(file), { headers: { "content-type": TYPES[name.split(".").pop()] } });
}
