// Tiny JSON-file database. Everything goes through read()/mutate() so it can be
// swapped for a real database later without touching the rest of the app.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export function emptyDb() {
  return {
    users: [],
    otps: [],
    groups: [],
    invites: [],
    expenses: [],
    settlements: [],
    wallets: [],
    walletTx: [],
    notifications: [],
    mailbox: [],
  };
}

export function read() {
  if (!fs.existsSync(DB_FILE)) return emptyDb();
  try {
    return { ...emptyDb(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch {
    return emptyDb();
  }
}

export function write(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  try {
    fs.renameSync(tmp, DB_FILE);
  } catch {
    // Windows can refuse the rename if the file is briefly locked (antivirus etc.)
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    try { fs.unlinkSync(tmp); } catch {}
  }
}

// All fs calls are synchronous, so a read-modify-write can't interleave with another request.
export function mutate(fn) {
  const db = read();
  const result = fn(db);
  write(db);
  return result;
}

export function id(prefix = "") {
  return prefix + crypto.randomBytes(6).toString("hex");
}

export function now() {
  return new Date().toISOString();
}

export function groupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[crypto.randomInt(chars.length)];
  return s;
}
