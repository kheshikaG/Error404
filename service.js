// Shared business logic used by the API routes.
import crypto from "crypto";
import { id, now } from "./db.js";
import { groupBalances, simplifyDebts, rawDebtCount } from "./money.js";
import { notify, sendEmail, sendSms } from "./notify.js";
import { voters } from "./approval.js";

export const userName = (db, uid) => db.users.find((u) => u.id === uid)?.name || "Unknown";
export const firstName = (db, uid) => userName(db, uid).split(" ")[0];

// ---------- verification codes ----------
const hash = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

export function issueCode(db, user, purpose) {
  const code = String(crypto.randomInt(100000, 1000000));
  db.otps = db.otps.filter((o) => !(o.userId === user.id && o.purpose === purpose));
  db.otps.push({
    id: id("o_"),
    userId: user.id,
    purpose,
    codeHash: hash(code),
    demoCode: process.env.DEMO_SHOW_CODES === "false" ? null : code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });
  if (purpose === "phone") {
    sendSms(db, { to: user.phone, text: `SplitSmart AI: your phone verification code is ${code}. It expires in 10 minutes.` });
  } else {
    sendEmail(db, {
      to: user.email,
      subject: purpose === "login" ? "Your SplitSmart AI sign-in code" : "Verify your email for SplitSmart AI",
      text: `Hi ${user.name.split(" ")[0]}, your ${purpose === "login" ? "sign-in" : "verification"} code is ${code}. It expires in 10 minutes.`,
    });
  }
  return code;
}

export function checkCode(db, uid, purpose, code) {
  const o = db.otps.find((x) => x.userId === uid && x.purpose === purpose);
  if (!o) return "No code found - tap 'Send a new code'";
  if (Date.now() > o.expiresAt) return "That code has expired - tap 'Send a new code'";
  if (o.attempts >= 5) return "Too many attempts - tap 'Send a new code'";
  o.attempts++;
  if (o.codeHash !== hash(String(code).trim())) return "That code isn't right. Check it and try again";
  db.otps = db.otps.filter((x) => x !== o);
  return null;
}

// ---------- wallet ----------
export function wallet(db, uid) {
  let w = db.wallets.find((x) => x.userId === uid);
  if (!w) {
    w = { userId: uid, balance: 0 };
    db.wallets.push(w);
  }
  return w;
}

export function walletTx(db, uid, type, amount, extra = {}) {
  const w = wallet(db, uid);
  w.balance += amount;
  const tx = { id: id("t_"), userId: uid, type, amount, balanceAfter: w.balance, at: now(), ...extra };
  db.walletTx.unshift(tx);
  return tx;
}

// ---------- groups ----------
export function sharedGroup(db, a, b) {
  return db.groups.some((g) => g.members.some((m) => m.userId === a) && g.members.some((m) => m.userId === b));
}

export function addMember(db, group, user, via) {
  if (group.members.some((m) => m.userId === user.id)) return false;
  group.members.push({ userId: user.id, role: "member", joinedAt: now(), via });
  for (const inv of db.invites) {
    if (inv.groupId === group.id && inv.email === user.email && inv.status === "pending") {
      inv.status = "accepted";
      inv.acceptedAt = now();
    }
  }
  db.notifications.forEach((n) => {
    if (n.userId === user.id && n.type === "invite" && n.ref === group.id) n.done = true;
  });
  for (const m of group.members) {
    if (m.userId !== user.id) {
      notify(db, m.userId, {
        type: "info",
        title: `${user.name} joined ${group.name}`,
        body: via === "code" ? "Joined with the group code." : "Accepted your email invite.",
        link: `/groups/${group.id}`,
      });
    }
  }
  return true;
}

export function createInvite(db, group, inviter, name, email) {
  const existing = db.invites.find((i) => i.groupId === group.id && i.email === email && i.status === "pending");
  const inv = existing || {
    id: id("i_"),
    token: crypto.randomBytes(12).toString("base64url"),
    groupId: group.id,
    name,
    email,
    invitedBy: inviter.id,
    status: "pending",
    createdAt: now(),
  };
  if (!existing) db.invites.push(inv);
  const link = `/invite/${inv.token}`;
  sendEmail(db, {
    to: email,
    subject: `${inviter.name} invited you to "${group.name}" on SplitSmart AI`,
    text: `Hi ${name.split(" ")[0]}, ${inviter.name} wants to split expenses with you in "${group.name}". Open the link to join, or enter the group code ${group.code} in the app.`,
    link,
  });
  const u = db.users.find((x) => x.email === email);
  if (u) {
    notify(db, u.id, {
      type: "invite",
      title: `${inviter.name} invited you to ${group.name}`,
      body: "Tap to view the invite and join the group.",
      link,
      ref: group.id,
    });
  }
  return inv;
}

// Deliver invites that were sent before this person had an account.
export function deliverPendingInvites(db, user) {
  for (const inv of db.invites) {
    if (inv.email !== user.email || inv.status !== "pending") continue;
    const g = db.groups.find((x) => x.id === inv.groupId);
    if (!g || g.members.some((m) => m.userId === user.id)) continue;
    if (db.notifications.some((n) => n.userId === user.id && n.type === "invite" && n.ref === g.id)) continue;
    notify(db, user.id, {
      type: "invite",
      title: `${userName(db, inv.invitedBy)} invited you to ${g.name}`,
      body: "Tap to view the invite and join the group.",
      link: `/invite/${inv.token}`,
      ref: g.id,
    });
  }
}

function expenseView(e, names, meId) {
  const v = voters(e);
  const approvals = (e.approvals || []).filter((u) => v.includes(u));
  return {
    ...e,
    status: e.status || "confirmed",
    paidByName: names[e.paidBy],
    createdByName: names[e.createdBy],
    voters: v,
    approvedBy: approvals.map((u) => ({ id: u, name: names[u] })),
    waitingOn: v.filter((u) => !approvals.includes(u)).map((u) => ({ id: u, name: names[u] })),
    approvalsCount: approvals.length,
    required: e.required || 0,
    canApprove: !e.deleted && e.status !== "confirmed" && v.includes(meId) && !approvals.includes(meId),
    canFlag: !e.deleted && v.includes(meId) && e.status !== "needs_review",
  };
}

export function groupActivity(db, group, names) {
  const ev = [];
  for (const m of group.members) ev.push({ type: "joined", at: m.joinedAt, text: `${names[m.userId]} ${m.via === "created" ? "created the group" : "joined the group"}`, groupId: group.id });
  for (const e of db.expenses.filter((x) => x.groupId === group.id)) {
    ev.push({ type: "expense", at: e.createdAt, text: `${names[e.createdBy]} added "${e.description}"`, amount: e.amount, currency: e.currency, status: e.deleted ? "removed" : e.status || "confirmed", groupId: group.id, ref: e.id });
    if (e.confirmedAt && e.status === "confirmed") ev.push({ type: "confirmed", at: e.confirmedAt, text: `"${e.description}" was approved`, amount: e.amount, currency: e.currency, status: "confirmed", groupId: group.id, ref: e.id });
    for (const f of e.flags || []) ev.push({ type: "flag", at: f.at, text: `${names[f.by]} flagged "${e.description}" for review`, status: "needs_review", groupId: group.id, ref: e.id });
  }
  for (const st of db.settlements.filter((x) => x.groupId === group.id)) {
    ev.push({ type: "payment", at: st.createdAt, text: `${names[st.fromUserId]} paid ${names[st.toUserId]} (${st.method})`, amount: st.amount, currency: st.currency, status: st.status, groupId: group.id, ref: st.id });
  }
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}

export function groupView(db, group, meId) {
  const memberIds = group.members.map((m) => m.userId);
  const expenses = db.expenses.filter((e) => e.groupId === group.id);
  const live = expenses.filter((e) => !e.deleted);
  const confirmed = live.filter((e) => (e.status || "confirmed") === "confirmed");
  const pending = live.filter((e) => e.status && e.status !== "confirmed");
  const settlements = db.settlements.filter((s) => s.groupId === group.id);
  const net = groupBalances(memberIds, live, settlements);
  const plan = simplifyDebts(net);
  const names = Object.fromEntries(db.users.map((u) => [u.id, u.name]));
  return {
    id: group.id,
    name: group.name,
    icon: group.icon || "users",
    currency: group.currency,
    code: group.code,
    approvalRule: group.approvalRule || "majority",
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    isOwner: group.createdBy === meId,
    members: group.members.map((m) => {
      const u = db.users.find((x) => x.id === m.userId);
      return { id: m.userId, name: u?.name || "Unknown", email: u?.email, role: m.role, joinedAt: m.joinedAt, net: net[m.userId] || 0, hasBank: !!u?.bank };
    }),
    invites: db.invites
      .filter((i) => i.groupId === group.id && i.status === "pending")
      .map((i) => ({ id: i.id, name: i.name, email: i.email, createdAt: i.createdAt })),
    expenses: expenses
      .slice()
      .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt) || b.createdAt.localeCompare(a.createdAt))
      .map((e) => expenseView(e, names, meId)),
    settlements: settlements
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => ({ ...s, fromName: names[s.fromUserId], toName: names[s.toUserId] })),
    plan: plan.map((p) => ({ ...p, fromName: names[p.from], toName: names[p.to] })),
    rawDebts: rawDebtCount(live),
    myNet: net[meId] || 0,
    totalSpent: confirmed.reduce((s, e) => s + e.amount, 0),
    pendingTotal: pending.reduce((s, e) => s + e.amount, 0),
    pendingCount: pending.length,
    needsMyApproval: live.filter((e) => expenseView(e, names, meId).canApprove).length,
    activity: groupActivity(db, group, names).slice(0, 40),
  };
}

export function groupSummary(db, group, meId) {
  const v = groupView(db, group, meId);
  return {
    id: v.id,
    name: v.name,
    icon: v.icon,
    currency: v.currency,
    code: v.code,
    memberCount: v.members.length,
    memberNames: v.members.map((m) => m.name),
    expenseCount: v.expenses.filter((e) => !e.deleted).length,
    totalSpent: v.totalSpent,
    myNet: v.myNet,
    pendingCount: v.pendingCount,
    needsMyApproval: v.needsMyApproval,
    lastActivity: v.activity[0]?.at || group.createdAt,
  };
}

// Everything the Dashboard / Settlements / Activity pages need, across all my groups.
export function overview(db, meId) {
  const groups = db.groups.filter((g) => g.members.some((m) => m.userId === meId));
  const out = { owe: [], owed: [], approvals: [], awaitingMe: [], awaitingThem: [], history: [], activity: [], totals: {} };
  for (const g of groups) {
    const v = groupView(db, g, meId);
    const cur = v.currency;
    out.totals[cur] ??= { owe: 0, owed: 0 };
    if (v.myNet < 0) out.totals[cur].owe += -v.myNet;
    if (v.myNet > 0) out.totals[cur].owed += v.myNet;
    const gi = { groupId: g.id, groupName: g.name, groupIcon: v.icon, currency: cur };
    for (const p of v.plan) {
      if (p.from === meId) out.owe.push({ ...gi, userId: p.to, name: p.toName, amount: p.amount });
      if (p.to === meId) out.owed.push({ ...gi, userId: p.from, name: p.fromName, amount: p.amount });
    }
    for (const e of v.expenses) if (e.canApprove) out.approvals.push({ ...gi, id: e.id, description: e.description, category: e.category, amount: e.amount, paidByName: e.paidByName, myShare: e.shares[meId] || 0, approvalsCount: e.approvalsCount, required: e.required, status: e.status, createdAt: e.createdAt });
    for (const s of v.settlements) {
      if (s.fromUserId !== meId && s.toUserId !== meId) continue;
      const row = { ...gi, ...s, direction: s.fromUserId === meId ? "out" : "in" };
      out.history.push(row);
      if (s.status === "pending_confirmation") (s.toUserId === meId ? out.awaitingMe : out.awaitingThem).push(row);
    }
    out.activity.push(...v.activity.map((a) => ({ ...a, groupName: g.name, groupIcon: v.icon })));
  }
  out.history.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  out.activity.sort((a, b) => b.at.localeCompare(a.at));
  out.activity = out.activity.slice(0, 60);
  return out;
}
