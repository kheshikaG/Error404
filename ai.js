// Optional Claude upgrade. If ANTHROPIC_API_KEY is set, Claude reads messy receipts and
// free-form sentences. Any error or missing key falls back to the built-in parsers.
import { parseExpense, categorize } from "./parse.js";

const KEY = () => process.env.ANTHROPIC_API_KEY;
const MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export const aiEnabled = () => !!KEY();

async function claude(content, maxTokens = 1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error("Claude API " + res.status + ": " + (await res.text()).slice(0, 200));
  const data = await res.json();
  const text = data.content?.map((c) => c.text || "").join("") || "";
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("No JSON in Claude reply");
  return JSON.parse(json[0]);
}

export async function analyseText(text, members, meId, currency) {
  const fallback = parseExpense(text, members, meId, currency);
  if (!KEY()) return fallback;
  try {
    const roster = members.map((m) => `${m.id}: ${m.name}${m.id === meId ? " (this is 'me'/'I')" : ""}`).join("\n");
    const r = await claude(
      `You split group expenses. Group members (id: name):\n${roster}\n\nCurrency: ${currency}.\n` +
        `The user said: """${text}"""\n\nReturn ONLY JSON: {"description": short title, "amount": number in major units, ` +
        `"paidBy": member id, "participants": [member ids who share it], "method": "equal"|"exact"|"percent"|"shares", ` +
        `"amounts": {id: number} (exact only), "percents": {id: number} (percent only), "shares": {id: number} (shares only), ` +
        `"notes": [short strings explaining assumptions]}. If no payer is stated assume ${meId}. If nobody is named, include everyone.`
    );
    const ids = new Set(members.map((m) => m.id));
    const participants = (r.participants || []).filter((u) => ids.has(u));
    const details = {};
    if (r.method === "exact") details.amounts = Object.fromEntries(Object.entries(r.amounts || {}).map(([k, v]) => [k, Math.round(v * 100)]));
    if (r.method === "percent") details.percents = r.percents || {};
    if (r.method === "shares") details.shares = r.shares || {};
    const cat = categorize(r.description + " " + text);
    return {
      description: String(r.description || fallback.description).slice(0, 60),
      category: cat.name,
      emoji: cat.emoji,
      amount: Math.round(Number(r.amount) * 100) || fallback.amount,
      currency,
      paidBy: ids.has(r.paidBy) ? r.paidBy : fallback.paidBy,
      participants: participants.length ? participants : fallback.participants,
      method: ["equal", "exact", "percent", "shares"].includes(r.method) ? r.method : "equal",
      details,
      notes: Array.isArray(r.notes) ? r.notes.slice(0, 4) : [],
      confidence: 0.95,
      source: "claude",
    };
  } catch (e) {
    console.warn("[ai] Claude failed, using built-in parser:", e.message);
    return fallback;
  }
}

export async function analyseReceiptImage(dataUrl) {
  if (!KEY()) return null;
  const m = String(dataUrl).match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/);
  if (!m) return null;
  try {
    const r = await claude(
      [
        { type: "image", source: { type: "base64", media_type: m[1].replace("jpg", "jpeg"), data: m[2] } },
        {
          type: "text",
          text: 'Read this receipt. Return ONLY JSON: {"merchant": string, "date": "YYYY-MM-DD" or null, "currency": ISO code or null if not printed, "items": [{"name": string, "amount": number (line total, major units), "qty": number}], "extras": number (tax+service+tip total), "discount": number, "total": number}',
        },
      ],
      2000
    );
    const c = (v) => Math.round(Number(v || 0) * 100);
    const items = (r.items || []).map((i) => ({ name: String(i.name).slice(0, 40), amount: c(i.amount), qty: i.qty || 1 }));
    const sum = items.reduce((s, i) => s + i.amount, 0);
    const total = c(r.total) || sum + c(r.extras) - c(r.discount);
    return { merchant: r.merchant || "", date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? r.date : null, currency: r.currency || null, items, subtotal: sum, extras: c(r.extras), discount: c(r.discount), total, reconciles: Math.abs(sum + c(r.extras) - c(r.discount) - total) <= 100, source: "claude" };
  } catch (e) {
    console.warn("[ai] Claude receipt read failed:", e.message);
    return null;
  }
}
