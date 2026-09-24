// Wipes all data so the app starts completely empty.  Run:  npm run reset
import fs from "fs";
import path from "path";
import { emptyDb, write } from "../lib/db.js";

fs.rmSync(path.join(process.cwd(), "data", "uploads"), { recursive: true, force: true });
write(emptyDb());
console.log("🧹 All data cleared. Run `npm run seed` to load the demo data again.");
