// Turns raw OCR text from a receipt photo into items + totals. Browser and server safe.

const SKIP = /\b(tel|phone|fax|vat reg|brn|receipt|invoice|table|server|cashier|date|time|thank|welcome|www|http|card|visa|mastercard|change|cash|tendered|balance|order|guest|covers?)\b/i;
const TOTAL = /\b(grand\s*total|total\s*due|amount\s*due|total|to\s*pay|net\s*payable)\b/i;
const SUBTOTAL = /\b(sub\s*-?\s*total)\b/i;
const EXTRA = /\b(vat|tax|gst|service(?:\s*charge)?|svc|tip|gratuity|levy)\b/i;
const DISCOUNT = /\b(discount|promo|less)\b/i;

function num(s) {
  const clean = s.replace(/[oO]/g, "0").replace(/[sS]/g, "5").replace(/\s/g, "").replace(/,(\d{2})$/, ".$1").replace(/,/g, "");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function parseReceiptText(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let total = null, subtotal = null, extras = 0, discount = 0;
  let merchant = "";
  for (const line of lines) {
    const m = line.match(/^(.*?)[\s:.\-]*(?:rs\.?|mur|\$|€|£)?\s*(-?\d[\d,]*[.,]\d{2}|-?\d{2,6})\s*[a-z]?$/i);
    if (!m) {
      if (!merchant && /[a-z]{3}/i.test(line) && !SKIP.test(line)) merchant = line.replace(/[^\w &'.-]/g, "").trim();
      continue;
    }
    let label = m[1].replace(/[^\w &'().%/-]/g, " ").replace(/\s+/g, " ").trim();
    const value = num(m[2]);
    if (value === null) continue;
    if (SUBTOTAL.test(label)) { subtotal = value; continue; }
    if (TOTAL.test(label)) { total = value; continue; }
    if (EXTRA.test(label)) { extras += value; continue; }
    if (DISCOUNT.test(label)) { discount += Math.abs(value); continue; }
    if (SKIP.test(label) || !/[a-z]{2}/i.test(label)) continue;
    let qty = 1;
    const q = label.match(/^(\d+)\s*[xX@]?\s+(.*)$/) || label.match(/^(.*?)\s+[xX]\s*(\d+)$/);
    if (q) {
      if (/^\d+$/.test(q[1])) { qty = parseInt(q[1]); label = q[2]; } else { qty = parseInt(q[2]); label = q[1]; }
    }
    items.push({ name: label.slice(0, 40), amount: value, qty });
  }
  const itemsSum = items.reduce((s, i) => s + i.amount, 0);
  const date = detectDate(text);
  const currency = detectCurrency(text);
  if (total === null) total = (subtotal ?? itemsSum) + extras - discount;
  const reconciles = Math.abs((subtotal ?? itemsSum) + extras - discount - total) <= 100;
  return { merchant: merchant.slice(0, 40), date, currency, items, subtotal: subtotal ?? itemsSum, extras, discount, total, reconciles };
}

// "12/09/2026", "12-09-26", "2026-09-12" -> "2026-09-12" (day-first, as used in Mauritius). null if unsure.
export function detectDate(text) {
  const t = String(text || "");
  let m = t.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return null;
}
function iso(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function detectCurrency(text) {
  const t = String(text || "");
  if (/\b(rs\.?|mur|rupees?)\b|₨/i.test(t)) return "MUR";
  if (/€|\beur\b/i.test(t)) return "EUR";
  if (/£|\bgbp\b/i.test(t)) return "GBP";
  if (/₹|\binr\b/i.test(t)) return "INR";
  if (/\$|\busd\b/i.test(t)) return "USD";
  return null;
}
