// Simulated email/SMS + in-app notifications.
// "Emails" land in the demo mailbox (/mailbox) and are printed in the terminal,
// so the demo never depends on an email provider.
import { id, now } from "./db.js";

export function sendEmail(db, { to, subject, text, link }) {
  const mail = { id: id("m_"), to, subject, text, link: link || null, at: now() };
  db.mailbox.unshift(mail);
  db.mailbox = db.mailbox.slice(0, 300);
  console.log(`\n[email] to ${to}\n  ${subject}\n  ${text}${link ? "\n  " + link : ""}\n`);
  return mail;
}

export function sendSms(db, { to, text }) {
  const mail = { id: id("m_"), to, subject: "SMS", text, sms: true, at: now() };
  db.mailbox.unshift(mail);
  console.log(`\n[sms] to ${to}: ${text}\n`);
  return mail;
}

// type: info | invite | cash_confirm | payment | expense | wallet
export function notify(db, userId, { type = "info", title, body, link = null, ref = null }) {
  const n = { id: id("n_"), userId, type, title, body, link, ref, read: false, done: false, at: now() };
  db.notifications.unshift(n);
  return n;
}
