import QRCode from "qrcode";
import { auth, isMember, fail } from "@/lib/api.js";

export async function GET(req, { params }) {
  const { id } = await params;
  const { db, user, res } = await auth();
  if (res) return res;
  const g = db.groups.find((x) => x.id === id);
  if (!isMember(g, user.id)) return fail("Not allowed", 403);
  const origin = new URL(req.url).origin;
  const svg = await QRCode.toString(`${origin}/join?code=${g.code}`, { type: "svg", margin: 1, width: 220 });
  return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
}
