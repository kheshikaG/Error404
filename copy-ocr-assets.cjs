// Copies the receipt-scanner (Tesseract OCR) files into /public so the scanner
// works fully offline on localhost - no CDN, no API key.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "public", "tesseract");
const nm = (p) => path.join(root, "node_modules", p);

function copy(src, dest) {
  if (!fs.existsSync(src)) { console.warn("[ocr] missing", src); return; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

try {
  copy(nm("tesseract.js/dist/tesseract.min.js"), path.join(out, "tesseract.min.js"));
  copy(nm("tesseract.js/dist/worker.min.js"), path.join(out, "worker.min.js"));
  const coreDir = nm("tesseract.js-core");
  if (fs.existsSync(coreDir)) {
    for (const f of fs.readdirSync(coreDir)) {
      if (f.startsWith("tesseract-core") && (f.endsWith(".js") || f.endsWith(".wasm"))) {
        copy(path.join(coreDir, f), path.join(out, "core", f));
      }
    }
  }
  copy(nm("@tesseract.js-data/eng/4.0.0/eng.traineddata.gz"), path.join(out, "lang", "eng.traineddata.gz"));
  console.log("[ocr] Receipt scanner files ready in public/tesseract");
} catch (e) {
  console.warn("[ocr] Could not copy OCR files:", e.message);
}
