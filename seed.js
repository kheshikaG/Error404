// Fills the app with demo data for the presentation.  Run:  npm run seed
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { emptyDb, write } from "../lib/db.js";
import { computeShares } from "../lib/money.js";
import { categorize } from "../lib/parse.js";
import { voters, requiredApprovals } from "../lib/approval.js";

const db = emptyDb();
const hash = bcrypt.hashSync("demo1234", 10);
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();

const people = [
  ["u_aarav", "Aarav Sharma", "aarav@demo.mu", "+23057001111", { bankName: "MCB", last4: "4821" }, 250000],
  ["u_priya", "Priya Nair", "priya@demo.mu", "+23057002222", { bankName: "SBM Bank", last4: "7710" }, 180000],
  ["u_zoe", "Zoe Martin", "zoe@demo.mu", "+23057003333", null, 0],
  ["u_sam", "Sam Lee", "sam@demo.mu", "+23057004444", { bankName: "Absa Bank Mauritius", last4: "0935" }, 60000],
  ["u_ravi", "Ravi Doobur", "ravi@demo.mu", "+23057005555", { bankName: "MauBank", last4: "3302" }, 120000],
];
for (const [id, name, email, phone, bank, bal] of people) {
  db.users.push({
    id, name, email, phone, passwordHash: hash, emailVerified: true, phoneVerified: true, onboarded: true,
    bank: bank ? { ...bank, holder: name, linkedAt: ago(400), verified: true } : null, createdAt: ago(500),
  });
  db.wallets.push({ userId: id, balance: bal });
  if (bal) db.walletTx.push({ id: "t_seed_" + id, userId: id, type: "topup", amount: bal, balanceAfter: bal, note: `From ${bank.bankName} ••${bank.last4}`, at: ago(300) });
}

const trip = {
  id: "g_trip", name: "Grand Baie Weekend", icon: "palm", approvalRule: "majority", currency: "MUR", code: "BAIE24", createdBy: "u_aarav", createdAt: ago(200),
  members: ["u_aarav", "u_priya", "u_zoe", "u_sam", "u_ravi"].map((u, i) => ({ userId: u, role: i ? "member" : "owner", joinedAt: ago(199 - i), via: i ? "invite" : "created" })),
};
const dinner = {
  id: "g_dinner", name: "Friday Dinner", icon: "utensils", approvalRule: "majority", currency: "MUR", code: "FRIDAY", createdBy: "u_aarav", createdAt: ago(5),
  members: [{ userId: "u_aarav", role: "owner", joinedAt: ago(5), via: "created" }],
};
db.groups.push(trip, dinner);

const names = Object.fromEntries(people.map((p) => [p[0], p[1].split(" ")[0]]));
const all = trip.members.map((m) => m.userId);
let n = 0;
function exp(description, rupees, paidBy, participants, method = "equal", details = {}, source = "manual", h = 100, extra = {}) {
  const amount = rupees * 100;
  const { shares, explanation } = computeShares(amount, method, participants, details, names);
  const cat = categorize(description);
  const e = {
    id: "e_seed" + ++n, groupId: "g_trip", description, category: cat.name, emoji: cat.emoji, amount, currency: "MUR",
    date: ago(h).slice(0, 10), paidBy, participants, method, details, shares, explanation, source, aiNotes: extra.aiNotes || [],
    aiConfidence: extra.aiConfidence ?? null, receipt: extra.receipt || null, createdBy: paidBy, createdAt: ago(h), deleted: false, flags: extra.flags || [],
  };
  const v = voters(e);
  e.required = requiredApprovals("majority", v.length);
  e.approvals = extra.approvals || v.slice(0, e.required);
  e.status = extra.status || "confirmed";
  if (e.status === "confirmed") e.confirmedAt = ago(h - 1);
  db.expenses.push(e);
  return e;
}
exp("Villa booking", 12000, "u_aarav", all, "equal", {}, "manual", 190);
exp("Catamaran trip", 7500, "u_priya", all, "equal", {}, "voice", 150, { aiNotes: ["Priya was named as the payer.", "No names were mentioned, so I included everyone in the group."] });
exp("Groceries at Winners", 3200, "u_ravi", ["u_ravi", "u_sam", "u_zoe", "u_aarav"], "shares", { shares: { u_ravi: 2, u_sam: 1, u_zoe: 1, u_aarav: 1 } }, "text", 120, { aiNotes: ["Split by shares: Ravi ×2, Sam ×1, Zoe ×1, Aarav ×1."] });
exp("Taxi to Pereybere", 900, "u_zoe", ["u_aarav", "u_priya", "u_zoe", "u_ravi"], "equal", {}, "text", 60, { aiNotes: ["Left out: Sam Lee."] });
exp("Seafood dinner", 6400, "u_sam", all, "percent", { percents: { u_aarav: 25, u_priya: 20, u_zoe: 15, u_sam: 20, u_ravi: 20 } }, "manual", 30);
// Waiting for approvals (Priya and Ravi still need to approve)
exp("Snorkelling gear", 1800, "u_aarav", ["u_aarav", "u_priya", "u_ravi"], "equal", {}, "voice", 3, {
  status: "pending_approval", approvals: ["u_aarav"], aiConfidence: 0.92,
  aiNotes: ["You were named as the payer.", "Split equally between you, Priya and Ravi."],
});
// Flagged by Zoe for a second look
exp("Beach bar drinks", 2400, "u_ravi", ["u_ravi", "u_zoe", "u_sam"], "equal", {}, "text", 6, {
  status: "needs_review", approvals: [], aiConfidence: 0.7,
  flags: [{ by: "u_zoe", reason: "I only had one drink - should be less for me", at: ago(5) }],
});

db.settlements.push(
  { id: "s_seed1", groupId: "g_trip", fromUserId: "u_zoe", toUserId: "u_aarav", amount: 150000, currency: "MUR", method: "cash", status: "completed", proof: null, reference: "", note: "", createdAt: ago(20), confirmedAt: ago(19) },
  { id: "s_seed2", groupId: "g_trip", fromUserId: "u_sam", toUserId: "u_priya", amount: 50000, currency: "MUR", method: "cash", status: "pending_confirmation", proof: null, reference: "", note: "", createdAt: ago(2), confirmedAt: null },
);
db.notifications.push(
  { id: "n_seed1", userId: "u_priya", type: "cash_confirm", title: "Did Sam give you Rs 500 in cash?", body: "Sam says they paid you in cash for Grand Baie Weekend. Please confirm so it's marked as paid.", link: "/groups/g_trip?tab=payments", ref: "s_seed2", read: false, done: false, at: ago(2) },
  { id: "n_seed3", userId: "u_priya", type: "approval", title: 'Please review "Snorkelling gear" in Grand Baie Weekend', body: "Aarav paid Rs 1,800. Your share is Rs 600. 2 of 3 approvals needed.", link: "/groups/g_trip", ref: "e_seed6", read: false, done: false, at: ago(3) },
  { id: "n_seed4", userId: "u_ravi", type: "approval", title: 'Zoe flagged "Beach bar drinks" for review', body: '"I only had one drink - should be less for me". Check the details and resubmit it for approval.', link: "/groups/g_trip", ref: "e_seed7", read: false, done: false, at: ago(5) },
  { id: "n_seed2", userId: "u_aarav", type: "info", title: "Welcome back, Aarav!", body: "Friday Dinner is ready - invite people with the code FRIDAY.", link: "/groups/g_dinner", ref: null, read: false, done: false, at: ago(4) },
);
db.mailbox.push({ id: "m_seed", to: "everyone", subject: "Demo mailbox ready", text: "Verification codes, invites and SMS messages from the app appear here.", at: ago(1) });

fs.rmSync(path.join(process.cwd(), "data", "uploads"), { recursive: true, force: true });
write(db);
console.log(`
✅ Demo data ready.

   Log in with any of these (password: demo1234):
     aarav@demo.mu   priya@demo.mu   zoe@demo.mu   sam@demo.mu   ravi@demo.mu

   Groups: "Grand Baie Weekend" (full history, code BAIE24)
           "Friday Dinner" (empty, code FRIDAY - for the live demo)

   Start the app:  npm run dev   ->  http://localhost:3000
`);
