"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Flag, Mail, Banknote, Clock, Bell, Activity as ActivityIcon, CircleCheck } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import { Button, Card, CardHeader, PageHeader, Tabs, Segmented, StatusBadge, Badge, Skeleton, EmptyState, useToast } from "@/components/ds";
import { ActivityItem } from "@/components/blocks.js";
import { api, timeAgo, firstName } from "@/lib/client.js";
import { fmt } from "@/lib/money.js";
import { settlementStatus } from "@/lib/status.js";

function ActionList({ o, reload }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  async function run(key, url, body, msg) {
    setBusy(key);
    try { await api(url, { method: "POST", body }); toast(msg, "success"); reload(); } catch (e) { toast(e.message, "error"); }
    setBusy("");
  }
  const count = o.approvals.length + o.awaitingMe.length + o.invites.length;
  return (
    <Card pad={false}>
      <CardHeader title="Needs your action" subtitle="Approvals, payment confirmations and invites" action={count ? <span className="count count-warning">{count}</span> : null} />
      <div className="card-body">
        {count === 0 ? (
          <div className="row" style={{ padding: "4px 0" }}><span className="icon-tile success"><CircleCheck size={18} aria-hidden /></span><span className="t-secondary">You're all caught up.</span></div>
        ) : (
          <div className="list">
            {o.awaitingMe.map((s) => (
              <div className="list-row row-wrap" key={s.id}>
                <span className="icon-tile sm warning"><Banknote size={16} aria-hidden /></span>
                <div className="grow stack-1" style={{ gap: 0, minWidth: 200 }}><span className="t-strong">Did {s.fromName} pay you {fmt(s.amount, s.currency)} in cash?</span><span className="t-small">{s.groupName} · {timeAgo(s.createdAt)}</span></div>
                <StatusBadge status="awaiting_confirmation" />
                <div className="row-2">
                  <Button size="sm" variant="secondary" loading={busy === s.id + "r"} onClick={() => run(s.id + "r", `/api/settlements/${s.id}`, { action: "reject" }, "Marked as not received")}>Not received</Button>
                  <Button size="sm" icon={Check} loading={busy === s.id + "c"} onClick={() => run(s.id + "c", `/api/settlements/${s.id}`, { action: "confirm" }, "Payment confirmed")}>I received it</Button>
                </div>
              </div>
            ))}
            {o.approvals.map((e) => (
              <div className="list-row row-wrap" key={e.id}>
                <span className="icon-tile sm warning"><Clock size={16} aria-hidden /></span>
                <div className="grow stack-1" style={{ gap: 0, minWidth: 200 }}>
                  <span className="t-strong">Approve "{e.description}" · {fmt(e.amount, e.currency)}</span>
                  <span className="t-small">{e.groupName} · {firstName(e.paidByName)} paid · your share {fmt(e.myShare, e.currency)} · {e.approvalsCount}/{e.required} approvals</span>
                </div>
                <StatusBadge status={e.status} />
                <div className="row-2">
                  <Button size="sm" variant="secondary" href={`/groups/${e.groupId}`}>Review</Button>
                  <Button size="sm" icon={Check} loading={busy === e.id} onClick={() => run(e.id, `/api/expenses/${e.id}`, { action: "approve" }, "Approved")}>Approve</Button>
                </div>
              </div>
            ))}
            {o.invites.map((n) => (
              <div className="list-row" key={n.id}>
                <span className="icon-tile sm primary"><Mail size={16} aria-hidden /></span>
                <div className="grow stack-1" style={{ gap: 0 }}><span className="t-strong">{n.title}</span><span className="t-small">{timeAgo(n.at)}</span></div>
                <Button size="sm" href={n.link}>View invite</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function Activity() {
  const app = useApp();
  const [o, setO] = useState(null);
  const [notes, setNotes] = useState(null);
  const [tab, setTab] = useState("activity");
  const [filter, setFilter] = useState("all");
  const load = () => {
    api("/api/overview").then(setO).catch(() => {});
    api("/api/notifications").then((d) => setNotes(d.notifications)).catch(() => {});
  };
  useEffect(load, [app.tick]);
  useEffect(() => { api("/api/notifications", { method: "POST", body: { all: true } }).then(() => app.refresh()); }, []);

  const feed = (o?.activity || []).filter((a) => filter === "all" || (filter === "expenses" && ["expense", "confirmed", "flag"].includes(a.type)) || (filter === "payments" && a.type === "payment") || (filter === "members" && a.type === "joined"));

  return (
    <main className="page stack-5">
      <PageHeader title="Activity" subtitle="What happened across your groups, and what needs you." />
      {!o ? <Skeleton h={160} /> : <ActionList o={o} reload={() => { load(); app.bump(); }} />}
      <Card pad={false}>
        <div style={{ padding: "0 20px" }}>
          <Tabs label="Activity sections" value={tab} onChange={setTab} tabs={[["activity", "Group activity"], ["notifications", "Notifications"]]} />
        </div>
        <div className="card-body stack">
          {tab === "activity" && (
            <>
              <Segmented label="Filter activity" value={filter} onChange={setFilter} options={[["all", "All"], ["expenses", "Expenses"], ["payments", "Payments"], ["members", "Members"]]} />
              {!o ? <Skeleton h={200} /> : feed.length === 0 ? <EmptyState icon={ActivityIcon} title="Nothing here yet" /> : <div className="list">{feed.map((a, i) => <ActivityItem key={i} a={a} showGroup />)}</div>}
            </>
          )}
          {tab === "notifications" && (!notes ? <Skeleton h={200} /> : notes.length === 0 ? <EmptyState icon={Bell} title="No notifications" /> : (
            <div className="list">
              {notes.map((n) => (
                <Link key={n.id} href={n.link || "#"} className="list-row clickable" style={{ color: "inherit", textDecoration: "none" }}>
                  <span className={"icon-tile sm" + (n.read ? "" : " primary")}><Bell size={16} aria-hidden /></span>
                  <div className="grow stack-1" style={{ gap: 0, minWidth: 0 }}>
                    <span className="t-strong ellipsis" style={{ fontWeight: n.read ? 500 : 600 }}>{n.title}</span>
                    <span className="t-small ellipsis">{n.body}</span>
                  </div>
                  {n.settlement && <StatusBadge status={settlementStatus(n.settlement.status)} />}
                  {n.expense && <StatusBadge status={n.expense.status} />}
                  {n.type === "invite" && <Badge tone={n.done ? "success" : "info"}>{n.done ? "Joined" : "Invite"}</Badge>}
                  <span className="t-small nowrap hide-mobile">{timeAgo(n.at)}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

export default function Page() {
  return <Shell><Activity /></Shell>;
}
