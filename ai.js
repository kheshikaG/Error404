"use client";
// Visual language that keeps three things clearly apart:
//   1. What the AI interpreted       (light-blue panel, Sparkles icon, confidence)
//   2. The deterministic calculation (neutral panel, exact numbers that always add up)
//   3. What the user confirms        (the primary action)
import { Sparkles, Calculator, ShieldCheck } from "lucide-react";
import { Badge } from "./core.js";
import { confidenceLevel } from "@/lib/status.js";

export function ConfidenceBadge({ value }) {
  const c = confidenceLevel(value);
  if (!c) return null;
  return <Badge tone={c.tone}>Confidence: {c.label}</Badge>;
}

export function AiPanel({ step, title = "AI interpretation", source, confidence, children }) {
  return (
    <section className="panel panel-ai" aria-label={title}>
      <div className="panel-head">
        {step && <span className="step-no">{step}</span>}
        <Sparkles size={16} aria-hidden />
        <span style={{ fontWeight: 600 }}>{title}</span>
        {source && <span className="t-small" style={{ color: "var(--primary-hover)" }}>· {source}</span>}
        <span className="grow" />
        <ConfidenceBadge value={confidence} />
      </div>
      <div className="panel-body stack">{children}</div>
    </section>
  );
}

export function CalcPanel({ step, title = "Calculation", note = "Exact, rule-based maths - not AI", children, footer }) {
  return (
    <section className="panel panel-calc" aria-label={title}>
      <div className="panel-head">
        {step && <span className="step-no">{step}</span>}
        <Calculator size={16} aria-hidden style={{ color: "var(--text-2)" }} />
        <span style={{ fontWeight: 600, color: "var(--navy)" }}>{title}</span>
        <span className="t-small">· {note}</span>
      </div>
      <div className="panel-body stack">{children}</div>
      {footer}
    </section>
  );
}

export function ConfirmPanel({ step, title = "Your confirmation", children }) {
  return (
    <section className="panel" aria-label={title}>
      <div className="panel-head">
        {step && <span className="step-no">{step}</span>}
        <ShieldCheck size={16} aria-hidden style={{ color: "var(--text-2)" }} />
        <span style={{ fontWeight: 600, color: "var(--navy)" }}>{title}</span>
      </div>
      <div className="panel-body stack">{children}</div>
    </section>
  );
}
