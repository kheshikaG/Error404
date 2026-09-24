import { ok, fail, body, auth } from "@/lib/api.js";
import { analyseReceiptImage } from "@/lib/ai.js";
import { parseReceiptText } from "@/lib/receipt.js";

// The browser reads the photo with Tesseract OCR (offline) and sends the text here.
// If a Claude key is set, the image itself is read by Claude for better accuracy.
export async function POST(req) {
  const { res } = await auth();
  if (res) return res;
  const b = await body(req);
  if (b.image) {
    const r = await analyseReceiptImage(b.image);
    if (r && r.items.length) return ok({ receipt: r });
  }
  if (!b.ocrText) return fail("Couldn't read the receipt - try a clearer photo or enter it manually");
  const r = parseReceiptText(b.ocrText);
  if (!r.items.length && !r.total) return fail("I couldn't find any prices on that receipt. Try a sharper, well-lit photo, or type it in.");
  return ok({ receipt: { ...r, source: "ocr" } });
}
