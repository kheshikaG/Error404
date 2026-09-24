"use client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";
import { Plus, UserPlus, ArrowLeftRight, Settings, Copy, Share2, Mail, Receipt, Lock } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import {
  Button, Card, CardHeader, Tabs, Notice, StatusBadge, Badge, Avatar, AvatarStack, Skeleton, EmptyState, Modal, Field, Input, Radio,
  MemberList, GroupIcon, GROUP_ICON_LABEL, useToast,
} from "@/components/ds";
import { ExpenseItem, PaymentItem, ActivityItem, BalanceBadge } from "@/components/blocks.js";
import { api, dayLabel, firstName } from "@/lib/client.js";
import { fmt } from "@/lib/money.js";
import { RULES } from "@/lib/approval.js";
import { GROUP_ICONS } from "@/lib/icons-keys.js";

function InviteModal({ g, onClose, onInvited }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/join?code=${g.code}` : "";
  async function invite(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await api(`/api/groups/${g.id}/members`, { method: "POST", body: { name, email } }); toast(`Invite sent to ${email}`, "success"); setName(""); setEmail(""); onInvited(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const copy = (t, what) => { navigator.clipboard?.writeText(t); toast(`${what} copied`, "success"); };
  return (
    <Modal title="Invite members" subtitle={g.name} onClose={onClose}>
      <div className="stack-5">
        <form className="stack-2" onSubmit={invite}>
          <span className="field-label">Invite by email</span>
          {err && <Notice tone="danger">{err}</Notice>}
          <div className="row-2 row-wrap">
            <Input style={{ flex: "1 1 140px" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" required />
            <Input style={{ flex: "2 1 200px" }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" required />
            <Button type="submit" icon={Mail} loading={busy}>Send invite</Button>
          </div>
        </form>
        <hr className="divider" />
        <div className="stack-2">
          <span className="field-label">Or share the group code</span>
          <div className="code">{g.code}</div>
          <div className="row-2 row-wrap" style={{ justifyContent: "center" }}>
            <Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(g.code, "Code")}>Copy code</Button>
            <Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(link, "Link")}>Copy join link</Button>
            <Button size="sm" variant="secondary" icon={Share2} href={`https://wa.me/?text=${encodeURIComponent(`Join "${g.name}" on SplitSmart AI with code ${g.code}: ${link}`)}`} target="_blank" rel="noreferrer">WhatsApp</Button>
          </div>
          <img src={`/api/groups/${g.id}/qr`} alt={`QR code to join ${g.name}`} width={160} height={160} style={{ margin: "8px auto 0" }} />
        </div>
      </div>
    </Modal>
  );
}

function SettingsModal({ g, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(g.name);
  const [icon, setIcon] = useState(g.icon);
  const [rule, setRule] = useState(g.approvalRule);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await api(`/api/groups/${g.id}`, { method: "PATCH", body: { name, icon, approvalRule: rule } }); toast("Group settings saved", "success"); onSaved(); onClose(); }
    catch (e) { toast(e.message, "error"); setBusy(false); }
  }
  return (
    <Modal title="Group settings" onClose={onClose} footer={<><span className="grow" /><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
      <div className="stack-4">
        <Field label="Group name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <div className="field"><span className="field-label">Icon</span>
          <div className="row-2 row-wrap">{GROUP_ICONS.map((k) => (
            <button key={k} type="button" className="choice" aria-checked={icon === k} role="radio" aria-label={GROUP_ICON_LABEL[k]} onClick={() => setIcon(k)} style={{ width: 44, height: 44, padding: 0, justifyContent: "center", color: icon === k ? "var(--primary)" : "var(--text-2)" }}><GroupIcon icon={k} /></button>
          ))}</div>
        </div>
        <div className="field"><span className="field-label">Approval rule for new expenses</span>
          <div className="stack-2">{Object.entries(RULES).map(([k, l]) => (
            <button key={k} type="button" className="choice" role="radio" aria-checked={rule === k} onClick={() => setRule(k)}><Radio on={rule === k} /><span className="t-strong">{l}</span></button>
          ))}</div>
        </div>
      </div>
    </Modal>
  );
}

function Group() {
  const { id } = useParams();
  const params = useSearchParams();
  const router = useRouter();
  const app = useApp();
  const meId = app.me.id;
  const [g, setG] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState(params.get("tab") || "expenses");
  const [inviting, setInviting] = useState(params.get("invite") === "1");
  const [settings, setSettings] = useState(false);

  const load = () => api(`/api/groups/${id}`).then((d) => setG(d.group)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id, app.tick]);
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t); }, [id]);

  if (err) return <main className="page"><Card><EmptyState icon={Lock} title="You can't open this group" text={err} action={<Button href="/groups">Back to groups</Button>} /></Card></main>;
  if (!g) return <main className="page stack-4"><Skeleton h={96} /><Skeleton h={320} /></main>;

  const names = Object.fromEntries(g.members.map((m) => [m.id, m.name]));
  const myPlan = g.plan.filter((p) => p.from === meId);
  const owedPlan = g.plan.filter((p) => p.to === meId);
  const pendingForMe = g.settlements.filter((s) => s.toUserId === meId && s.status === "pending_confirmation");
  const live = g.expenses.filter((e) => !e.deleted);
  let lastDay = null;

  return (
    <main className="page stack-5">
      {/* Header */}
      <header className="row row-between row-wrap" style={{ gap: 16 }}>
        <div className="row">
          <span className="icon-tile lg primary"><GroupIcon icon={g.icon} size={26} /></span>
          <div className="stack-1">
            <h1 className="t-page">{g.name}</h1>
            <div className="row-2 row-wrap t-small">
              <AvatarStack names={g.members.map((m) => m.name)} max={6} />
              <span>{g.members.length} members{g.invites.length ? ` · ${g.invites.length} invited` : ""}</span>
              <Badge tone="neutral">Code {g.code}</Badge>
            </div>
          </div>
        </div>
        <div className="row-2 row-wrap">
          {g.isOwner && <Button variant="ghost" icon={Settings} onClick={() => setSettings(true)} aria-label="Group settings" />}
          <Button variant="secondary" icon={UserPlus} onClick={() => setInviting(true)}>Invite</Button>
          <Button variant="secondary" icon={ArrowLeftRight} onClick={() => app.openSettle({ groupId: g.id })}>Settle up</Button>
          <Button icon={Plus} onClick={() => app.openAddExpense({ groupId: g.id })}>Add expense</Button>
        </div>
      </header>

      {pendingForMe.map((s) => (
        <Notice key={s.id} tone="warning" title={`${s.fromName} says they paid you ${fmt(s.amount, s.currency)} in cash`}
          action={<Button size="sm" variant="secondary" onClick={() => setTab("payments")}>Review</Button>}>
          Confirm you received it so it counts as paid.
        </Notice>
      ))}

      <div className="split">
        <div className="stack-5" style={{ minWidth: 0 }}>
          {/* Balance summary */}
          <Card className="row row-between row-wrap" style={{ gap: 16 }}>
            <div className="stack-1">
              <span className="t-label">Your position</span>
              <span className={"t-amount-xl" + (g.myNet > 0 ? " t-positive" : "")}>{g.myNet === 0 ? fmt(0, g.currency) : fmt(Math.abs(g.myNet), g.currency)}</span>
              <span className="t-small">{g.myNet > 0 ? "Owed to you in total" : g.myNet < 0 ? "You owe in total" : "You're all settled in this group"}</span>
            </div>
            <div className="stack-2" style={{ alignItems: "flex-end" }}>
              <BalanceBadge net={g.myNet} currency={g.currency} />
              {g.pendingCount > 0 && <StatusBadge status="pending_approval" label={`${g.pendingCount} pending · ${fmt(g.pendingTotal, g.currency)}`} />}
            </div>
          </Card>

          <Card pad={false}>
            <div style={{ padding: "0 20px" }}>
              <Tabs label="Group sections" value={tab} onChange={setTab} tabs={[["expenses", "Expenses", g.needsMyApproval], ["balances", "Balances"], ["payments", "Payments", pendingForMe.length], ["activity", "Activity"], ["members", `Members (${g.members.length})`]]} />
            </div>
            <div className="card-body">
              {tab === "expenses" && (g.expenses.length === 0 ? (
                <EmptyState icon={Receipt} title="No expenses yet" text="Scan a receipt, type or say it, or enter it manually. You'll review everything before it's saved." action={<Button icon={Plus} onClick={() => app.openAddExpense({ groupId: g.id })}>Add the first expense</Button>} />
              ) : (
                <div className="list">
                  {g.pendingCount > 0 && <Notice tone="info">Pending and flagged expenses don't change anyone's balance until they're confirmed.</Notice>}
                  {g.expenses.map((e) => {
                    const d = e.date || e.createdAt.slice(0, 10);
                    const head = d !== lastDay ? <div className="date-head">{dayLabel(d)}</div> : null;
                    lastDay = d;
                    return <Fragment key={e.id}>{head}<ExpenseItem e={e} meId={meId} currency={g.currency} names={names} onChanged={() => { load(); app.bump(); }} /></Fragment>;
                  })}
                </div>
              ))}

              {tab === "balances" && (
                <div className="stack-5">
                  <div className="stack-2">
                    <h3 className="t-card">Simplest way to settle</h3>
                    {g.plan.length === 0 ? <StatusBadge status="settled" label="Everyone is settled up" /> : (
                      <>
                        <p className="t-small">{g.rawDebts > g.plan.length ? `Simplified from ${g.rawDebts} separate debts to ${g.plan.length} payment${g.plan.length > 1 ? "s" : ""}.` : `${g.plan.length} payment${g.plan.length > 1 ? "s" : ""} needed.`} Based on confirmed expenses only.</p>
                        <div className="list">
                          {g.plan.map((p, i) => (
                            <div className="list-row" key={i}>
                              <Avatar name={p.fromName} size="sm" me={p.from === meId} />
                              <span className="grow" style={{ fontSize: 14.5 }}><b>{p.from === meId ? "You" : firstName(p.fromName)}</b> pay{p.from === meId ? "" : "s"} <b>{p.to === meId ? "you" : firstName(p.toName)}</b></span>
                              <span className="t-amount">{fmt(p.amount, g.currency)}</span>
                              <StatusBadge status="awaiting_payment" label="Awaiting payment" />
                              {p.from === meId && <Button size="sm" onClick={() => app.openSettle({ groupId: g.id, to: p.to, amount: p.amount })}>Settle</Button>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="stack-2">
                    <h3 className="t-card">Each member's balance</h3>
                    <MemberList members={[...g.members].sort((a, b) => b.net - a.net)} meId={meId} renderMeta={(m) => (
                      m.net === 0 ? <StatusBadge status="settled" /> : m.net > 0 ? <Badge tone="success">Gets back {fmt(m.net, g.currency)}</Badge> : <span className="t-amount">Owes {fmt(-m.net, g.currency)}</span>
                    )} />
                  </div>
                </div>
              )}

              {tab === "payments" && (g.settlements.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No payments yet" text="When someone settles up, it appears here with its status." action={<Button variant="secondary" onClick={() => app.openSettle({ groupId: g.id })}>Settle up</Button>} />
              ) : <div className="list">{g.settlements.map((s) => <PaymentItem key={s.id} s={s} meId={meId} onChanged={() => { load(); app.bump(); }} />)}</div>)}

              {tab === "activity" && (g.activity.length === 0 ? <p className="t-small">No activity yet.</p> : <div className="list">{g.activity.map((a, i) => <ActivityItem key={i} a={a} />)}</div>)}

              {tab === "members" && (
                <div className="stack-4">
                  <MemberList members={g.members} meId={meId} renderMeta={(m) => (
                    <div className="row-2">{m.role === "owner" && <Badge tone="info">Owner</Badge>}{m.hasBank && <Badge tone="neutral">Bank linked</Badge>}</div>
                  )} />
                  {g.invites.length > 0 && (
                    <div className="stack-2">
                      <span className="t-label">Invited · waiting to join</span>
                      <div className="list">{g.invites.map((i) => (
                        <div className="list-row" key={i.id}><span className="icon-tile sm"><Mail size={16} aria-hidden /></span><div className="grow stack-1" style={{ gap: 0 }}><span className="t-strong">{i.name}</span><span className="t-small">{i.email}</span></div><StatusBadge status="pending_approval" label="Invite sent" /></div>
                      ))}</div>
                    </div>
                  )}
                  <Button variant="secondary" icon={UserPlus} onClick={() => setInviting(true)} style={{ alignSelf: "flex-start" }}>Invite members</Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="stack-4">
          <Card pad={false}>
            <CardHeader title="Settle up" />
            <div className="card-body stack-2">
              {myPlan.length === 0 && owedPlan.length === 0 && <StatusBadge status="settled" label="Nothing to settle" />}
              {myPlan.map((p, i) => (
                <div key={i} className="row">
                  <Avatar name={p.toName} size="sm" />
                  <div className="grow stack-1" style={{ gap: 0 }}><span className="t-small">You owe {firstName(p.toName)}</span><span className="t-amount">{fmt(p.amount, g.currency)}</span></div>
                  <Button size="sm" onClick={() => app.openSettle({ groupId: g.id, to: p.to, amount: p.amount })}>Settle</Button>
                </div>
              ))}
              {owedPlan.map((p, i) => (
                <div key={"o" + i} className="row">
                  <Avatar name={p.fromName} size="sm" />
                  <div className="grow stack-1" style={{ gap: 0 }}><span className="t-small">{firstName(p.fromName)} owes you</span><span className="t-amount t-positive">{fmt(p.amount, g.currency)}</span></div>
                  <StatusBadge status="awaiting_payment" label="Awaiting" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="stack-2">
            <div className="row row-between t-small"><span>Confirmed spending</span><span className="t-amount">{fmt(g.totalSpent, g.currency)}</span></div>
            <div className="row row-between t-small"><span>Expenses</span><span className="t-strong">{live.length}</span></div>
            <div className="row row-between t-small"><span>Approval rule</span><span className="t-strong">{g.approvalRule === "majority" ? "Majority" : g.approvalRule === "all" ? "Everyone" : "None"}</span></div>
            <div className="row row-between t-small"><span>Currency</span><span className="t-strong">{g.currency}</span></div>
          </Card>
        </div>
      </div>

      {inviting && <InviteModal g={g} onClose={() => { setInviting(false); if (params.get("invite")) router.replace(`/groups/${id}`); }} onInvited={load} />}
      {settings && <SettingsModal g={g} onClose={() => setSettings(false)} onSaved={load} />}
    </main>
  );
}

export default function Page() {
  return <Shell><Suspense><Group /></Suspense></Shell>;
}
