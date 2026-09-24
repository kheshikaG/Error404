// Assigns receipt items to people from a sentence. Browser and server safe.
// "Zoe had the burger, Sam and I shared the pizza, everyone had nachos"
export function assignItems(text, items, members, meId) {
  const t = text.toLowerCase();
  const alias = {};
  members.forEach((m) => {
    const f = m.name.toLowerCase().split(" ")[0];
    alias[f] = m.id;
    alias[m.name.toLowerCase()] = m.id;
  });
  ["i", "me", "my", "myself"].forEach((w) => (alias[w] = meId));
  const clauses = t.split(/[,.;\n]|\bthen\b|\bwhile\b|\band then\b/).map((s) => s.trim()).filter(Boolean);
  const out = items.map((it) => ({ ...it }));
  let hits = 0;
  for (const c of clauses) {
    const everyone = /\b(everyone|everybody|all of us|we all|all)\b/.test(c);
    const who = everyone ? members.map((m) => m.id) : [...new Set(Object.keys(alias).filter((a) => new RegExp(`\\b${a}\\b`).test(c)).map((a) => alias[a]))];
    if (!who.length) continue;
    out.forEach((it) => {
      const words = it.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3);
      if (words.some((w) => new RegExp(`\\b${w.replace(/s$/, "")}`).test(c))) { it.people = who; hits++; }
    });
  }
  return { items: out, hits };
}

