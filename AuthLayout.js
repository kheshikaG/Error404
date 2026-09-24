"use client";
import { DemoBar, Logo } from "@/components/Shell.js";
import { Stepper } from "@/components/ds";

export const SIGNUP_STEPS = ["Account", "Email", "Phone", "Bank"];

export default function AuthLayout({ title, subtitle, step, icon: Icon, children }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <DemoBar />
      <main className="auth">
        <div className="auth-card stack-5">
          <div className="row" style={{ justifyContent: "center" }}><Logo /></div>
          <div className="card card-pad stack-5" style={{ padding: 32 }}>
            {step != null && <Stepper steps={SIGNUP_STEPS} current={step} />}
            <div className="stack-2">
              {Icon && <span className="icon-tile lg primary"><Icon size={24} aria-hidden /></span>}
              <h1 className="t-page" style={{ fontSize: 26 }}>{title}</h1>
              {subtitle && <p className="t-secondary">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
