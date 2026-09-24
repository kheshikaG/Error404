"use client";
import { useEffect, useState } from "react";
import { Mail, Smartphone, Inbox } from "lucide-react";
import { DemoBar, Logo } from "@/components/Shell.js";
import { Button, Card, PageHeader, SearchInput, Badge, EmptyState } from "@/components/ds";
import { api, timeAgo } from "@/lib/client.js";

// DEMO ONLY - shows every simulated email and SMS so the presentation never depends on a real provider.
export default function Mailbox() {
  const [mail, setMail] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const load = () => api("/api/mailbox").then((d) => setMail(d.mail)).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);
  const list = (mail || []).filter((m) => !q || m.to.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ minHeight: "100vh" }}>
      <DemoBar />
      <div className="public-top"><Logo href="/dashboard" /><Button variant="secondary" href="/dashboard">Back to app</Button></div>
      <main className="page page-narrow stack-4" style={{ paddingTop: 8 }}>
        <PageHeader title="Demo mailbox" subtitle="Every email and SMS the app sends appears here and in the terminal. It updates every few seconds." />
        <SearchInput value={q} onChange={setQ} placeholder="Filter by email or phone" />
        {mail && list.length === 0 && <Card><EmptyState icon={Inbox} title="Nothing here yet" /></Card>}
        {list.map((m) => (
          <Card key={m.id} className="stack-2">
            <div className="row row-between row-wrap">
              <Badge tone={m.sms ? "neutral" : "info"} icon={m.sms ? Smartphone : Mail}>{m.sms ? "SMS" : "Email"} to {m.to}</Badge>
              <span className="t-small">{timeAgo(m.at)}</span>
            </div>
            {!m.sms && <span className="t-card">{m.subject}</span>}
            <p className="t-body">{m.text.split(/(\b\d{6}\b)/).map((p, i) => (/^\d{6}$/.test(p) ? <b key={i} className="mono" style={{ color: "var(--primary)", fontSize: 16 }}>{p}</b> : p))}</p>
            {m.link && <Button size="sm" variant="secondary" href={m.link} style={{ alignSelf: "flex-start" }}>Open invite link</Button>}
          </Card>
        ))}
      </main>
    </div>
  );
}
