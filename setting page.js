"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ShieldCheck, Sparkles, Wrench, LogOut, Mail, Smartphone, KeyRound, Palette, Inbox } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import { Button, Card, CardHeader, PageHeader, Field, Input, Select, Notice, Avatar, StatusBadge, Badge, ListRow, useToast } from "@/components/ds";
import { api } from "@/lib/client.js";
import { BANKS } from "@/lib/bank.js";

function Settings() {
  const app = useApp();
  const router = useRouter();
  const toast = useToast();
  const u = app.me;
  const [edit, setEdit] = useState(!u.bank);
  const [f, setF] = useState({ bankName: "", holder: u.name, accountNumber: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function link(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await api("/api/bank", { method: "POST", body: f }); toast("Bank account linked", "success"); await app.refresh(); setEdit(false); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function unlink() { await api("/api/bank", { method: "DELETE" }); toast("Bank account removed", "info"); await app.refresh(); setEdit(true); }
  async function logout() { await api("/api/auth/logout", { method: "POST" }); router.replace("/login"); }

  return (
    <main className="page page-narrow stack-5">
      <PageHeader title="Settings" />
      <Card className="row">
        <Avatar name={u.name} size="lg" me />
        <div className="grow stack-1" style={{ gap: 0 }}><h2 className="t-card">{u.name}</h2><span className="t-small">{u.email} · {u.phone}</span></div>
      </Card>

      <Card pad={false}>
        <CardHeader title="Security" icon={ShieldCheck} />
        <div className="card-body list">
          <ListRow leading={<span className="icon-tile sm"><Mail size={16} aria-hidden /></span>} title="Email" subtitle={u.email} trailing={<StatusBadge status="confirmed" label="Verified" />} />
          <ListRow leading={<span className="icon-tile sm"><Smartphone size={16} aria-hidden /></span>} title="Phone" subtitle={u.phone} trailing={<StatusBadge status="confirmed" label="Verified" />} />
          <ListRow leading={<span className="icon-tile sm"><KeyRound size={16} aria-hidden /></span>} title="Two-step verification" subtitle="A one-time code is required every time you log in" trailing={<Badge tone="success">On</Badge>} />
        </div>
      </Card>

      <Card pad={false}>
        <CardHeader title="Bank account" icon={Landmark} subtitle="Used to add money to your wallet and withdraw it" />
        <div className="card-body">
          {u.bank && !edit ? (
            <div className="row row-wrap">
              <div className="grow stack-1" style={{ gap: 0 }}><span className="t-strong">{u.bank.bankName} ••{u.bank.last4}</span><span className="t-small">{u.bank.holder} · linked {new Date(u.bank.linkedAt).toLocaleDateString()}</span></div>
              <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>Change</Button>
              <Button size="sm" variant="danger" onClick={unlink}>Remove</Button>
            </div>
          ) : (
            <form className="stack-4" onSubmit={link}>
              {err && <Notice tone="danger">{err}</Notice>}
              <Field label="Bank">{(id) => <Select id={id} value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })}><option value="">Choose your bank</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</Select>}</Field>
              <Field label="Account holder">{(id) => <Input id={id} value={f.holder} onChange={(e) => setF({ ...f, holder: e.target.value })} />}</Field>
              <Field label="Account number" hint="Only the last 4 digits are stored.">{(id) => <Input id={id} inputMode="numeric" value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value })} />}</Field>
              <div className="row-2">{u.bank && <Button type="button" variant="secondary" onClick={() => setEdit(false)}>Cancel</Button>}<Button type="submit" loading={busy}>Link bank account</Button></div>
            </form>
          )}
        </div>
      </Card>

      <Card pad={false}>
        <CardHeader title="AI assistance" icon={Sparkles} />
        <div className="card-body stack-2">
          <p className="t-secondary">{app.aiMode === "claude" ? "Claude reads receipts and understands typed or spoken expenses." : "The built-in AI works offline. Add ANTHROPIC_API_KEY to .env.local to use Claude for messier receipts."}</p>
          <p className="t-small">The AI only suggests. The calculation is exact, rule-based maths, and nothing is saved until you confirm it.</p>
        </div>
      </Card>

      <Card pad={false}>
        <CardHeader title="Demo tools" icon={Wrench} />
        <div className="card-body list">
          <ListRow href="/mailbox" leading={<span className="icon-tile sm"><Inbox size={16} aria-hidden /></span>} title="Demo mailbox" subtitle="Every simulated email and SMS" />
          <ListRow href="/design-system" leading={<span className="icon-tile sm"><Palette size={16} aria-hidden /></span>} title="Design system" subtitle="Colours, type and components used across the app" />
        </div>
      </Card>

      <Button variant="secondary" icon={LogOut} onClick={logout} style={{ alignSelf: "flex-start" }}>Log out</Button>
    </main>
  );
}

export default function Page() {
  return <Shell><Settings /></Shell>;
}
