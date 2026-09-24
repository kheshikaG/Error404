import fs from "fs";
import path from "path";
import { id } from "./db.js";

// Saves a base64 data URL (image or PDF, max 5 MB). Returns the stored file name.
export function saveDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:(image\/(png|jpe?g|webp|gif|heic)|application\/pdf);base64,(.+)$/);
  if (!m) return { error: "Proof must be an image (PNG/JPG) or a PDF" };
  const buf = Buffer.from(m[3], "base64");
  if (buf.length > 5 * 1024 * 1024) return { error: "Proof file is too big (max 5 MB)" };
  const ext = m[1] === "application/pdf" ? "pdf" : m[2].replace("jpeg", "jpg");
  fs.mkdirSync(path.join(process.cwd(), "data", "uploads"), { recursive: true });
  const name = id("proof_") + "." + ext;
  fs.writeFileSync(path.join(process.cwd(), "data", "uploads", name), buf);
  return { name };
}
