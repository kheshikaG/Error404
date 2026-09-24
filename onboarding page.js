"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Landmark, Lock } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import AuthLayout from "@/components/AuthLayout.js";
import { Button, Field, Input, Select, Notice, useToast } from "@/components/ds";
import { api, goNext } from "@/lib/client.js";
import { BANKS } from "@/lib/bank.js";

function Onboarding() {
  const router = useRouter();
  const toast = useToast();
  const app = useApp();
  const [f, setF] = useState({ bankName: "", holder: app.me?.name || "", accountNumber: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  async function go(action) {
    setErr(""); setBusy(action);
    try {
      const d = await api("/api/onboarding", { method: "POST", body: action === "skip" ? { action } : { action, ...f } });
      toast(action === "skip" ? "You can link a bank later in Settings" : "Bank account linked", "success");
      await app.refresh();
      goNext(router, d.next);
    } catch (e) { setErr(e.message); setBusy(""); }
  }

  return (
    <AuthLayout title="Add your bank details" icon={Landmark} step={3} subtitle="Link a bank to add money to your wallet and withdraw it. You can skip this for now.">
      <form className="stack-4" onSubmit={(e) => { e.preventDefault(); go("link"); }}>
        {err && <Notice tone="danger">{err}</Notice>}
        <Field label="Bank">{(id) => <Select id={id} value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })}><option value="">Choose your bank</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</Select>}</Field>
        <Field label="Account holder name">{(id) => <Input id={id} value={f.holder} onChange={(e) => setF({ ...f, holder: e.target.value })} />}</Field>
        <Field label="Account number" hint="Only the last 4 digits are stored.">{(id) => <Input id={id} inputMode="numeric" value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value.replace(/[^\d ]/g, "") })} placeholder="000 000 000 000" />}</Field>
        <div className="row-2 t-small"><Lock size={14} aria-hidden /> Your full account number is never saved.</div>
        <Button type="submit" size="lg" block loading={busy === "link"} disabled={!!busy}>Link bank account</Button>
        <Button type="button" variant="ghost" block loading={busy === "skip"} disabled={!!busy} onClick={() => go("skip")}>Skip for now</Button>
      </form>
    </AuthLayout>
  );
}

// Uses the app shell only for auth + user data; the layout is the sign-up card.
export default function Page() {
  return <Shell bare><Onboarding /></Shell>;
}
