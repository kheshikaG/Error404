"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, Smartphone, KeyRound, ArrowLeft } from "lucide-react";
import AuthLayout from "@/components/AuthLayout.js";
import { Button, Notice, Spinner, useToast } from "@/components/ds";
import { api, goNext } from "@/lib/client.js";

export default function Verify() {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cool, setCool] = useState(0);

  const load = async () => { try { setS(await api("/api/auth/session")); } catch { router.replace("/login"); } };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (cool > 0) { const t = setTimeout(() => setCool(cool - 1), 1000); return () => clearTimeout(t); } }, [cool]);

  async function submit(e) {
    e?.preventDefault();
    setErr(""); setBusy(true);
    try {
      const d = await api("/api/auth/verify", { method: "POST", body: { code } });
      if (d.stage === "phone") { toast("Email verified", "success"); setCode(""); await load(); setBusy(false); }
      else { toast(s.stage === "login" ? "Signed in" : "Phone verified - your account is ready", "success"); goNext(router, d.next); }
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function resend() { await api("/api/auth/resend", { method: "POST" }); setCool(30); toast("We sent a new code", "info"); load(); }

  if (!s) return <div className="auth"><Spinner size={28} /></div>;
  const where = s.stage === "phone" ? s.phone : s.email;
  const cfg = {
    email: ["Verify your email", Mail, 1],
    phone: ["Verify your phone", Smartphone, 2],
    login: ["Two-step verification", KeyRound, null],
  }[s.stage];

  return (
    <AuthLayout title={cfg[0]} icon={cfg[1]} step={cfg[2]} subtitle={<>{s.stage === "login" ? `Hi ${s.name}. ` : ""}Enter the 6-digit code we sent {s.stage === "phone" ? "by SMS " : ""}to <b style={{ color: "var(--navy)" }}>{where}</b>.</>}>
      <form className="stack-4" onSubmit={submit}>
        {s.demoCode && (
          <Notice tone="info" title="Demo mode" action={<Button type="button" size="sm" variant="secondary" onClick={() => setCode(s.demoCode)}>Fill it in</Button>}>
            Your code is <b className="mono">{s.demoCode}</b>. It's also in the <a href="/mailbox" target="_blank">demo mailbox</a> and the terminal.
          </Notice>
        )}
        {err && <Notice tone="danger">{err}</Notice>}
        <input className="input otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} autoFocus aria-label="Verification code"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
        <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6}>Verify</Button>
        <div className="row row-between">
          <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} onClick={() => router.replace("/login")}>Back</Button>
          <Button type="button" variant="ghost" size="sm" disabled={cool > 0} onClick={resend}>{cool ? `Resend in ${cool}s` : "Send a new code"}</Button>
        </div>
      </form>
    </AuthLayout>
  );
}
