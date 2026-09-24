"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Users, ArrowDownLeft, Clock, Wallet, Mail, Banknote, ChevronRight, CircleCheck } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import { Button, Card, CardHeader, PageHeader, Kpi, Badge, StatusBadge, Skeleton, EmptyState, GroupIcon, Notice } from "@/components/ds";
import { GroupCard, ActivityItem } from "@/components/blocks.js";
import { api, firstName, timeAgo } from "@/lib/client.js";
import { fmt } from "@/lib/money.js";

function Attention({ o, app, reload }) {
  const items = [
    ...o.awaitingMe.map((s) => ({ key: s.id, icon: Banknote, title: `Did ${firstName(s.fromName)} pay you ${fmt(s.amount, s.currency)} in cash?`, sub: `${s.groupName} · confirm so it counts`, status: "awaiting_confirmation", href: "/settlements" })),
    ...o.approvals.map((e) => ({ key: e.id, icon: Clock, title: `Approve "${e.description}" · ${fmt(e.amount, e.currency)}`, sub: `${e.groupName} · your share ${fmt(e.myShare, e.currency)} · ${e.approvalsCount}/${e.required} approvals`, status: "pending_approval", href: `/groups/${e.groupId}` })),
    ...o.invites.map((n) => ({ key: n.id, icon: Mail, title: n.title, sub: timeAgo(n.at), badge: <Badge tone="info">Invite</Badge>, href: n.link })),
    ...o.owe.map((p) => ({ key: p.groupId + p.userId, icon: ArrowDownLeft, title: `You owe ${p.name} ${fmt(p.amount, p.currency)}`, sub: p.groupName, status: "awaiting_payment", action: <Button size="sm" onClick={() => app.openSettle({ groupId: p.groupId, to: p.userId, amount: p.amount })}>Settle</Button> })),
  ];
  return (
    <Card pad={false}>
      <CardHeader title="Needs your attention" subtitle={items.length ? `${items.length} item${items.length > 1 ? "s" : ""}` : undefined} action={<Button variant="ghost" size="sm" href="/activity">View activity</Button>} />
      <div className="card-body">
        {items.length === 0 ? (
          <div className="row" style={{ padding: "8px 0" }}><span className="icon-tile success"><CircleCheck size={18} aria-hidden /></span><div><div className="t-strong">You're all caught up</div><div className="t-small">Nothing needs your approval or payment right now.</div></div></div>
        ) : (
          <div className="list">
            {items.slice(0, 6).map((i) => {
              const body = (
                <>
                  <span className="icon-tile sm"><i.icon size={16} aria-hidden /></span>
                  <div className="grow stack-1" style={{ gap: 0, minWidth: 0 }}><span className="t-strong ellipsis" style={{ fontSize: 14.5 }}>{i.title}</span><span className="t-small ellipsis">{i.sub}</span></div>
                  <span className="hide-mobile">{i.badge || (i.status && <StatusBadge status={i.status} />)}</span>
                  {i.action || <ChevronRight size={16} aria-hidden style={{ color: "var(--text-3)" }} />}
                </>
              );
              return i.href ? <Link key={i.key} href={i.href} className="list-row clickable" style={{ color: "inherit", textDecoration: "none" }}>{body}</Link> : <div key={i.key} className="list-row">{body}</div>;
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function Dashboard() {
  const app = useApp();
  const [groups, setGroups] = useState(null);
  const [o, setO] = useState(null);
  const load = () => {
    api("/api/groups").then((d) => setGroups(d.groups)).catch(() => {});
    api("/api/overview").then(setO).catch(() => {});
  };
  useEffect(load, [app.tick]);

  const [cur, tot] = Object.entries(o?.totals || {})[0] || ["MUR", { owe: 0, owed: 0 }];

  return (
    <main className="page stack-6">
      <PageHeader title={`Hi ${firstName(app.me.name)}`} subtitle="Here's where you stand across your groups." actions={<span className="hide-mobile"><Button icon={Plus} onClick={() => app.openAddExpense()}>Add expense</Button></span>} />

      <section className="grid-3" aria-label="Balance summary">
        <Card>
          <Kpi label="Total you owe" icon={Clock} tone="warning" sub={tot.owe ? `Across ${o.owe.length} payment${o.owe.length > 1 ? "s" : ""}` : "Nothing owed"}>
            {o ? <span className="t-amount-xl">{fmt(tot.owe, cur)}</span> : <Skeleton h={36} w={140} />}
          </Kpi>
        </Card>
        <Card>
          <Kpi label="Total owed to you" icon={ArrowDownLeft} tone="success" sub={tot.owed ? `From ${o.owed.length} ${o.owed.length > 1 ? "people" : "person"}` : "Nobody owes you"}>
            {o ? <span className={"t-amount-xl" + (tot.owed ? " t-positive" : "")}>{fmt(tot.owed, cur)}</span> : <Skeleton h={36} w={140} />}
          </Kpi>
        </Card>
        <Link href="/wallet" className="card card-pad card-link">
          <Kpi label={<>Wallet balance <Badge tone="neutral">Demo</Badge></>} icon={Wallet} tone="primary" sub={app.me.bank ? `${app.me.bank.bankName} ••${app.me.bank.last4}` : "No bank linked yet"}>
            <span className="t-amount-xl">{fmt(app.wallet || 0)}</span>
          </Kpi>
        </Link>
      </section>

      {o && <Attention o={o} app={app} reload={load} />}

      <div className="split">
        <section className="stack-4" aria-label="Your groups">
          <div className="row row-between"><h2 className="t-section">Your groups</h2><Button variant="ghost" size="sm" href="/groups">View all</Button></div>
          {!groups ? <div className="grid-2"><Skeleton h={120} /><Skeleton h={120} /></div>
            : groups.length === 0 ? (
              <Card><EmptyState icon={Users} title="No groups yet" text="Create a group for a trip, your flat or a dinner, or join one with a code." action={<Button href="/groups/new" icon={Plus}>Create a group</Button>} /></Card>
            ) : <div className="grid-2">{groups.slice(0, 6).map((g) => <GroupCard key={g.id} g={g} />)}</div>}
        </section>
        <Card pad={false} as="section" aria-label="Recent activity">
          <CardHeader title="Recent activity" action={<Button variant="ghost" size="sm" href="/activity">All</Button>} />
          <div className="card-body">
            {!o ? <Skeleton h={200} /> : o.activity.length === 0 ? <p className="t-small">Nothing yet.</p> : <div className="list">{o.activity.slice(0, 6).map((a, i) => <ActivityItem key={i} a={a} showGroup />)}</div>}
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function Page() {
  return <Shell><Dashboard /></Shell>;
}
