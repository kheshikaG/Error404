// Built-in "AI" for understanding expenses written or spoken in plain English.
// Works offline with no API key. If ANTHROPIC_API_KEY is set, lib/ai.js tries Claude first
// and falls back to this parser.
//
// Examples it understands:
//   "I paid Rs 1200 for dinner, split equally with Priya and Zoe"
//   "Zoe paid 900 for the taxi, everyone except Sam"
//   "Priya paid four thousand five hundred for the villa, Priya 50%, Zoe 25%, me 25%"
//   "Groceries 800 paid by Ravi, shares Ravi 2 Sam 1 me 1"
//   "Hotel 3000, I paid, Sam 1000 Zoe 2000"

const SMALL = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, a: 1,
};
const BIG = { hundred: 100, thousand: 1000, lakh: 100000, lakhs: 100000, million: 1000000 };

// "four thousand five hundred" -> "4500"
const NUMW = Object.keys(SMALL).filter((w) => w !== "a").concat(Object.keys(BIG)).join("|");
const RUN = new RegExp(`\\b(?:a\\s+(?=hundred|thousand|lakh))?(?:${NUMW})(?:[\\s-]+(?:and[\\s-]+)?(?:${NUMW}))*\\b`, "gi");

function runToNumber(run) {
  let total = 0, cur = 0;
  for (const w of run.toLowerCase().split(/[\s-]+/)) {
    if (w === "and") continue;
    if (w in SMALL) cur += SMALL[w];
    else if (w === "hundred") cur = (cur || 1) * 100;
    else if (w in BIG) { total += (cur || 1) * BIG[w]; cur = 0; }
  }
  return total + cur;
}

export function wordsToNumbers(text) {
  return String(text).replace(RUN, (run) => String(runToNumber(run)));
}

const CATEGORIES = [
  ["🍽️", "Food", ["dinner", "lunch", "breakfast", "brunch", "restaurant", "meal", "food", "pizza", "burger", "sushi", "biryani", "snacks", "takeaway", "kfc", "mcdonalds"]],
  ["☕", "Coffee", ["coffee", "cafe", "café", "tea", "latte"]],
  ["🍻", "Drinks", ["drinks", "beer", "bar", "cocktails", "wine", "pub"]],
  ["🛒", "Groceries", ["groceries", "grocery", "supermarket", "winners", "intermart", "market", "shopping"]],
  ["🚕", "Transport", ["taxi", "uber", "cab", "bus", "train", "metro", "ride", "transport", "parking"]],
  ["⛽", "Fuel", ["fuel", "petrol", "gas", "diesel"]],
  ["🏨", "Stay", ["hotel", "airbnb", "villa", "stay", "hostel", "accommodation", "bungalow"]],
  ["✈️", "Travel", ["flight", "flights", "tickets", "ticket", "boat", "catamaran", "trip", "tour"]],
  ["🎬", "Fun", ["movie", "cinema", "concert", "game", "bowling", "karaoke", "party", "club"]],
  ["🏠", "Home", ["rent", "electricity", "water", "internet", "wifi", "bills", "cleaning", "cleaner"]],
  ["🎁", "Gifts", ["gift", "present", "birthday", "cake"]],
];

export function categorize(text) {
  const t = String(text || "").toLowerCase();
  for (const [emoji, name, words] of CATEGORIES) {
    if (words.some((w) => new RegExp(`\\b${w}\\b`).test(t))) return { emoji, name };
  }
  return { emoji: "🧾", name: "General" };
}

const ME = ["me", "i", "myself", "my", "mine", "you"];
const ALL = /\b(everyone|everybody|all of us|all|whole group|the group|the gang|us all)\b/;
const EXCEPT = /\b(?:except(?: for)?|but not|excluding|without|apart from|minus)\s+([a-z ,&]+?)(?=[.;!?]|\b(?:and it|split|paid|shares?)\b|$)/;
const CURRENCY = "(?:rs\\.?|mur|rupees?|₹|\\$|€|£|usd|eur|gbp|inr)";

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function aliasMap(members, meId) {
  const map = {};
  for (const m of members) {
    const full = m.name.toLowerCase().trim();
    const first = full.split(/\s+/)[0];
    map[full] = m.id;
    if (!(first in map)) map[first] = m.id;
  }
  for (const w of ME) if (meId && !(w in map)) map[w] = meId;
  return map;
}

function findNames(fragment, map) {
  const found = [];
  const words = Object.keys(map).sort((a, b) => b.length - a.length);
  let t = " " + fragment.toLowerCase() + " ";
  for (const w of words) {
    const re = new RegExp(`(^|[^a-z])${escapeRe(w)}(?:'s)?(?=[^a-z]|$)`, "g");
    if (re.test(t)) {
      if (!found.includes(map[w])) found.push(map[w]);
      t = t.replace(re, "$1 ");
    }
  }
  return found;
}

export function parseExpense(text, members, meId, currency = "MUR") {
  const notes = [];
  const original = String(text || "").trim();
  const t = wordsToNumbers(original.toLowerCase()).replace(/(\d),(\d{3})/g, "$1$2");
  const map = aliasMap(members, meId);
  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const nameAlt = Object.keys(map).sort((a, b) => b.length - a.length).map(escapeRe).join("|");

  // ---------- who owes what (percent / shares / exact) ----------
  const pairs = [];
  if (nameAlt) {
    const a = new RegExp(`\\b(${nameAlt})\\b(?:'s)?\\s*(?:[:=\\-]|pays|gets|owes|has|takes|x)?\\s*(${CURRENCY}\\s*)?(\\d+(?:\\.\\d+)?)\\s*(%|percent|shares?|parts?|x)?`, "g");
    let m;
    while ((m = a.exec(t))) pairs.push({ uid: map[m[1]], value: parseFloat(m[3]), unit: m[4] || "", cur: !!m[2], index: m.index });
    const b = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(%|percent|shares?|parts?)\\s*(?:for|to|by|from)?\\s*\\b(${nameAlt})\\b`, "g");
    while ((m = b.exec(t))) if (!pairs.some((p) => p.uid === map[m[3]])) pairs.push({ uid: map[m[3]], value: parseFloat(m[1]), unit: m[2], index: m.index });
  }
  const pct = pairs.filter((p) => /%|percent/.test(p.unit));
  const shr = pairs.filter((p) => /share|part|x/.test(p.unit));

  // ---------- amount ----------
  let amount = 0;
  const pairNums = new Set(pairs.map((p) => p.index));
  const curA = t.match(new RegExp(`${CURRENCY}\\s*(\\d+(?:\\.\\d+)?)`));
  const curB = t.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:rs|rupees?|mur|dollars?|bucks|euros?|pounds?)\\b`));
  if (curA) amount = parseFloat(curA[1]);
  else if (curB) amount = parseFloat(curB[1]);
  else {
    const nums = [...t.matchAll(/(\d+(?:\.\d+)?)(?!\s*(?:%|percent|shares?|parts?))/g)]
      .filter((m) => ![...pairNums].some((i) => m.index >= i && m.index < i + 25 && pairs.some((p) => p.index === i && String(p.value) === m[1])))
      .map((m) => parseFloat(m[1]));
    if (nums.length) amount = Math.max(...nums);
  }
  // Exact amounts given per person but no total -> total is their sum
  const exactPairs = pairs.filter((p) => !p.unit && p.value !== amount);
  if (!amount && exactPairs.length) amount = exactPairs.reduce((s, p) => s + p.value, 0);
  const amountCents = Math.round(amount * 100);
  if (!amountCents) notes.push("I couldn't find an amount - please enter it.");

  // ---------- payer ----------
  let paidBy = meId;
  let payerFound = false;
  if (/\b(i|we)\s+(?:just\s+)?(paid|covered|spent|bought|got|picked up|settled|put)\b|\bpaid by me\b|\bon me\b/.test(t)) {
    paidBy = meId; payerFound = true;
  } else if (nameAlt) {
    const p1 = t.match(new RegExp(`\\b(${nameAlt})\\s+(?:just\\s+)?(?:paid|covered|spent|bought|got|picked up|settled|put)\\b`));
    const p2 = t.match(new RegExp(`\\b(?:paid|covered|bought|settled)\\s+by\\s+(${nameAlt})\\b`));
    const hit = p2 || p1;
    if (hit) { paidBy = map[hit[1]]; payerFound = true; }
  }
  if (!payerFound) notes.push("Nobody was named as the payer, so I assumed you paid.");

  // ---------- participants ----------
  const allIds = members.map((m) => m.id);
  let participants;
  const exceptM = t.match(EXCEPT);
  const exceptIds = exceptM ? findNames(exceptM[1], map).filter((u) => u !== undefined) : [];
  let rest = exceptM ? t.replace(exceptM[0], " ") : t;
  if (pairs.length) {
    participants = [...new Set(pairs.map((p) => p.uid))];
  } else if (ALL.test(rest) || exceptIds.length) {
    participants = allIds.filter((u) => !exceptIds.includes(u));
  } else {
    // names mentioned outside the payer phrase
    const payerPhrase = new RegExp(`\\b(?:${nameAlt || "zzz"})\\s+(?:paid|covered|spent|bought)\\b|\\bpaid by\\s+(?:${nameAlt || "zzz"})\\b`, "g");
    const mentioned = findNames(rest.replace(payerPhrase, " "), map).filter((u) => u !== meId || /\b(me|myself|us)\b/.test(rest));
    if (mentioned.length) {
      const onlyFor = /\b(?:only|just)\s+for\b|\bon behalf of\b|\bfor them\b|\bfor (?:him|her)\b/.test(rest);
      participants = [...new Set(onlyFor ? mentioned : [paidBy, ...mentioned])];
      if (/\bwith\b/.test(rest) && !participants.includes(meId) && /\bwe\b|\bus\b/.test(rest)) participants.push(meId);
      if (onlyFor) notes.push(`The payer isn't included - it was paid only for ${mentioned.map((u) => nameById[u]).join(" & ")}.`);
    } else {
      participants = allIds.slice();
      notes.push("No names were mentioned, so I included everyone in the group.");
    }
  }
  if (exceptIds.length) notes.push(`Left out: ${exceptIds.map((u) => nameById[u]).join(", ")}.`);

  // ---------- method ----------
  let method = "equal";
  const details = {};
  if (pct.length >= 1) {
    method = "percent";
    details.percents = {};
    pct.forEach((p) => (details.percents[p.uid] = p.value));
    const given = pct.reduce((s, p) => s + p.value, 0);
    const missing = participants.filter((u) => !(u in details.percents));
    if (missing.length && given < 100) missing.forEach((u) => (details.percents[u] = +((100 - given) / missing.length).toFixed(2)));
  } else if (shr.length >= 1 || /\bshares?\b/.test(t)) {
    method = "shares";
    details.shares = {};
    participants.forEach((u) => (details.shares[u] = 1));
    (shr.length ? shr : pairs).forEach((p) => (details.shares[p.uid] = p.value));
  } else if (exactPairs.length >= 1 && pairs.every((p) => !p.unit)) {
    method = "exact";
    details.amounts = {};
    exactPairs.forEach((p) => (details.amounts[p.uid] = Math.round(p.value * 100)));
    const given = Object.values(details.amounts).reduce((a, b) => a + b, 0);
    const missing = participants.filter((u) => !(u in details.amounts));
    if (missing.length === 1 && given < amountCents) details.amounts[missing[0]] = amountCents - given;
  }
  if (/\bequal(?:ly)?\b|\beven(?:ly)?\b|\b50\s*\/\s*50\b|\bhalf\b/.test(t) && method !== "percent") method = "equal";

  // ---------- description ----------
  const cat = categorize(t);
  let description = "";
  const forM = original.match(/\bfor\s+(?:the\s+|our\s+|a\s+|an\s+)?([A-Za-z][A-Za-z' ]{1,30}?)(?=[,.;!?]|\s+(?:split|with|between|among|and|everyone|except|paid|shares?|\d)|$)/i);
  if (forM && !findNames(forM[1], map).length) description = forM[1].trim();
  if (!description && cat.name !== "General") {
    const w = CATEGORIES.find((c) => c[1] === cat.name)[2].find((x) => new RegExp(`\\b${x}\\b`).test(t));
    description = w;
  }
  if (!description) description = "Shared expense";
  description = description.charAt(0).toUpperCase() + description.slice(1);

  const confidence = Math.max(0.3, 1 - notes.length * 0.15 - (amountCents ? 0 : 0.4));
  return {
    description,
    category: cat.name,
    emoji: cat.emoji,
    amount: amountCents,
    currency,
    paidBy,
    participants,
    method,
    details,
    notes,
    confidence: +confidence.toFixed(2),
    source: "built-in",
  };
}
