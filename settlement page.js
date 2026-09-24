"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowDownLeft, Clock, Wallet, ChevronRight, History } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import { Button, Card, CardHeader, PageHeader, Kpi, StatusBadge, Badge, Avatar, Skeleton, EmptyState, Segmented, GroupIcon } from "@/components/ds";
import { PaymentItem } from "@/components/blocks.js";
import { api } from "@/lib/client.js";
import { fmt } from "@/lib/money.js";

function Settlements() {
  const app = useApp();
  const [o, setO] = useState(null);
  const [filter, setFilter] = useState("all");
  const load = () => api("/api/overview").then(setO).catch(() => {});
  useEffect(() => { load(); }, [app.tick]);
  if (!o) return <main className="page stack-4"><Skeleton h={100} /><Skeleton h={300} /></main>;

  const [cur, tot] = Object.entries(o.totals)[0] || ["MUR", { owe: 0, owed: 0 }];
  const history = o.history.filter((s) => filter === "all" || (filter === "pending" && s.status === "pending_confirmation") || (filter === "in" && s.direction === "in") || (filter === "out" && s.direction === "out"));
  const Row = ({ p, owe }) => (
    <div className="list-row">
      <Avatar name={p.name} />
      <div className="grow stack-1" style={{ gap: 0, minWidth: 0 }}>
        <span className="t-strong ellipsis">{owe ? `You owe ${p.name}` : `${p.name} owes you`}</span>
        <span className="t-small row-2" style={{ gap: 6 }}><GroupIcon icon={p.groupIcon} size={13} />{p.groupName}</span>
      </div>
      <span className={"t-amount" + (owe ? "" : " t-positive")} style={{ fontSize: 16 }}>{fmt(p.amount, p.currency)}</span>
      {owe ? <Button size="sm" onClick={() => app.openSettle({ groupId: p.groupId, to: p.userId, amount: p.amount })}>Settle</Button> : <StatusBadge status="awaiting_payment" label="Awaiting" />}
    </div>
  );

  return (
    <main className="page stack-5">
      <PageHeader title="Settlements" subtitle="Who owes whom, and every payment's status."
        actions={<><Button variant="secondary" icon={Wallet} href="/wallet">Wallet</Button><Button icon={ArrowLeftRight} onClick={() => app.openSettle()}>Settle up</Button></>} />

      <section className="grid-3" aria-label="Summary">
        <Card><Kpi label="You owe" icon={Clock} tone="warning" sub={o.owe.length ? `${o.owe.length} payment${o.owe.length > 1 ? "s" : ""} to make` : "Nothing to pay"}><span className="t-amount-xl">{fmt(tot.owe, cur)}</span></Kpi></Card>
        <Card><Kpi label="Owed to you" icon={ArrowDownLeft} tone="success" sub={o.owed.length ? `From ${o.owed.length} ${o.owed.length > 1 ? "people" : "person"}` : "Nobody owes you"}><span className={"t-amount-xl" + (tot.owed ? " t-positive" : "")}>{fmt(tot.owed, cur)}</span></Kpi></Card>
        <Card><Kpi label="Awaiting confirmation" icon={Clock} tone="warning" sub="Cash payments not yet confirmed"><span className="t-amount-xl">{o.awaitingMe.length + o.awaitingThem.length}</span></Kpi></Card>
      </section>

      <div className="grid-2">
        <Card pad={false}>
          <CardHeader title="You owe" subtitle="Based on confirmed expenses" />
          <div className="card-body">{o.owe.length ? <div className="list">{o.owe.map((p, i) => <Row key={i} p={p} owe />)}</div> : <StatusBadge status="settled" label="You don't owe anyone" />}</div>
        </Card>
        <Card pad={false}>
          <CardHeader title="Owed to you" subtitle="Waiting for them to pay" />
          <div className="card-body">{o.owed.length ? <div className="list">{o.owed.map((p, i) => <Row key={i} p={p} />)}</div> : <StatusBadge status="settled" label="Nobody owes you" />}</div>
        </Card>
      </div>

      <Card pad={false}>
        <CardHeader title="Payment history" icon={History} action={<Segmented label="Filter payments" value={filter} onChange={setFilter} options={[["all", "All"], ["pending", "Pending"], ["in", "Received"], ["out", "Sent"]]} />} />
        <div className="card-body">
          {history.length === 0 ? <EmptyState icon={ArrowLeftRight} title="No payments here" text="Payments you make or receive appear here with their status and proof." />
            : <div className="list">{history.map((s) => <PaymentItem key={s.id} s={s} meId={app.me.id} showGroup onChanged={() => { load(); app.bump(); }} />)}</div>}
        </div>
      </Card>

      <Link href="/wallet" className="card card-link card-pad row">
        <span className="icon-tile primary"><Wallet size={20} aria-hidden /></span>
        <div className="grow stack-1" style={{ gap: 0 }}><span className="t-card">Wallet <Badge tone="neutral">Demo</Badge></span><span className="t-small">Add money, send it, or withdraw to your bank</span></div>
        <span className="t-amount-lg">{fmt(app.wallet || 0)}</span>
        <ChevronRight size={18} aria-hidden style={{ color: "var(--text-3)" }} />
      </Link>
    </main>
  );
}

export default function Page() {
  return <Shell><Settlements /></Shell>;
}
