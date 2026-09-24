"use client";
import { ShieldCheck, Users, Receipt, Mic, Calculator, Wallet, Sparkles, ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/Shell.js";
import { Button } from "@/components/ds";

const FEATURES = [
  [ShieldCheck, "Verified accounts", "Email and phone verification, plus a one-time code every time you log in."],
  [Users, "Groups of any size", "Invite by email, or share a 6-character code or QR code. No member limit."],
  [Receipt, "Receipt scanning", "AI reads each item. You choose who had what before anything is saved."],
  [Mic, "Type or say it", "\"I paid Rs 1,200 for dinner with Priya and Zoe\" becomes a draft for you to review."],
  [Calculator, "Exact, transparent maths", "Five split types. Shares always add up to the cent, and every split is explained."],
  [Wallet, "Clear settlements", "Pay from your wallet, upload bank proof, or record cash that the receiver confirms."],
];

export default function Landing() {
  return (
    <PublicShell>
      <main className="page stack-6" style={{ paddingTop: 48 }}>
        <section className="stack-5 center" style={{ maxWidth: 720, margin: "0 auto" }}>
          <span className="badge badge-info" style={{ alignSelf: "center" }}><Sparkles size={13} aria-hidden /> AI-assisted group expenses</span>
          <h1 style={{ fontSize: "clamp(34px, 6vw, 52px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--navy)", lineHeight: 1.1 }}>
            Split smarter.<br />Settle with confidence.
          </h1>
          <p className="t-secondary" style={{ fontSize: 18, maxWidth: 560, margin: "0 auto" }}>
            Shared money made simple and transparent. The AI does the reading and the maths is exact. You always confirm before anything counts.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Button size="lg" href="/signup" iconRight={ArrowRight}>Create free account</Button>
            <Button size="lg" variant="secondary" href="/login">Log in</Button>
          </div>
        </section>
        <section className="grid-3" aria-label="Features">
          {FEATURES.map(([I, t, d]) => (
            <div key={t} className="card card-pad stack-2">
              <span className="icon-tile primary"><I size={20} aria-hidden /></span>
              <h2 className="t-card">{t}</h2>
              <p className="t-secondary">{d}</p>
            </div>
          ))}
        </section>
        <p className="center t-small"><a href="/design-system">View the SplitSmart AI design system</a></p>
      </main>
    </PublicShell>
  );
}
