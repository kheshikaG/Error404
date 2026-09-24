"use client";
// Composite blocks reused across pages so a group, an expense, a payment or an
// activity entry always looks and behaves the same everywhere.
import Link from "next/link";
import { useState } from "react";
import { Camera, Keyboard, Mic, PenLine, Flag, Check, RotateCcw, Trash2, FileText, Wallet, Landmark, Banknote, UserPlus, Receipt, ArrowDownLeft, ArrowUpRight, CircleCheck } from "lucide-react";
import {
  Badge, StatusBadge, Button, Avatar, AvatarStack, Progress, Disclosure, Input, Notice, GroupIcon, CategoryIcon, useToast,
} from "@/components/ds";
import { api, timeAgo, firstName } from "@/lib/client.js";
import { fmt } from "@/lib/money.js";
import { settlementStatus } from "@/lib/status.js";

export const SOURCE = {
  receipt: ["Scanned receipt", Camera],
  voice: ["Voice", Mic],
  text: ["Typed", Keyboard],
  manual: ["Manual", PenLine],
};
export const PAY_METHOD = { wallet: ["Wallet", Wallet], bank: ["Bank transfer", Landmark], cash: ["Cash", Banknote] };

// Your position, in words + colour (never colour alone).
export function BalanceBadge({ net, currency }) {
  if (!net) return <StatusBadge status="settled" />;
  if (net > 0) return <Badge tone="success" icon={ArrowDownLeft}>You're owed {fmt(net, currency)}</Badge>;
  return <StatusBadge status="awaiting_payment" label={`You owe ${fmt(-net, currency)}`} />;
}

export function GroupCard({ g }) {
  return (
    <Link href={`/groups/${g.id}`} className="card card-link card-pad-sm stack" style={{ padding: 20 }}>
      <div className="row">
        <span className="icon-tile primary"><GroupIcon icon={g.icon} /></span>
        <div className="grow stack-1" style={{ gap: 0 }}>
          <h3 className="t-card ellipsis">{g.name}</h3>
          <span className="t-small">{g.memberCount} {g.memberCount === 1 ? "member" : "members"} · {g.expenseCount} expenses</span>
        </div>
      </div>
      <div className="row row-between row-wrap" style={{ gap: 8 }}>
        <AvatarStack names={g.memberNames} max={5} />
        <div className="row-2 row-wrap">
          {g.needsMyApproval > 0 && <StatusBadge status="pending_approval" label={`${g.needsMyApproval} to approve`} />}
          <BalanceBadge net={g.myNet} currency={g.currency} />
        </div>
      </div>
    </Link>
  );
}

// ---------------- Expense ----------------
export function ExpenseItem({ e, meId, currency, names = {}, onChanged }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [reason, setReason] = useState("");
  const mine = e.shares[meId] || 0;
  const iPaid = e.paidBy === meId;
  const status = e.deleted ? "removed" : e.status;
  const [srcLabel, SrcIcon] = SOURCE[e.source] || SOURCE.manual;

  async function act(action, extra = {}) {
    setBusy(action);
    try {
      if (action === "remove") await api(`/api/expenses/${e.id}`, { method: "DELETE" });
      else await api(`/api/expenses/${e.id}`, { method: "POST", body: { action, ...extra } });
      toast({ approve: "Approved", flag: "Flagged for review", resubmit: "Sent for approval again", remove: "Expense removed" }[action], "success");
      setFlagging(false);
      onChanged?.();
    } catch (err) { toast(err.message, "error"); }
    setBusy("");
  }

  let impact;
  if (e.deleted || (!e.voters.includes(meId) && !iPaid)) impact = <span className="t-small">Not involved</span>;
  else if (iPaid) impact = <><span className="t-small">You lent</span><span className="t-amount t-positive">{fmt(e.amount - mine, currency)}</span></>;
  else impact = <><span className="t-small">Your share</span><span className="t-amount">{fmt(mine, currency)}</span></>;

  return (
    <div className="list-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 0, opacity: e.deleted ? 0.6 : 1 }}>
      <div className="row" role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={(ev) => ev.key === "Enter" && setOpen(!open)} style={{ cursor: "pointer" }}>
        <span className="icon-tile"><CategoryIcon category={e.category} /></span>
        <div className="grow stack-1" style={{ gap: 2, minWidth: 0 }}>
          <span className="t-strong ellipsis" style={{ textDecoration: e.deleted ? "line-through" : "none" }}>{e.description}</span>
          <span className="t-small ellipsis">{iPaid ? "You" : firstName(e.paidByName)} paid {fmt(e.amount, currency)} · <SrcIcon size={12} aria-hidden style={{ display: "inline", verticalAlign: -1 }} /> {srcLabel}</span>
          <span className="show-mobile" style={{ marginTop: 4 }}><StatusBadge status={status} detail={status === "pending_approval" ? `${e.approvalsCount}/${e.required}` : undefined} /></span>
        </div>
        <div className="stack-1 right hide-mobile" style={{ gap: 0 }}>{impact}</div>
        <span className="hide-mobile"><StatusBadge status={status} detail={status === "pending_approval" ? `${e.approvalsCount}/${e.required}` : undefined} /></span>
      </div>

      {open && (
        <div className="stack-4" style={{ padding: "16px 0 4px 52px" }}>
          <div className="show-mobile stack-1" style={{ gap: 0 }}>{impact}</div>
          {(status === "pending_approval" || status === "needs_review") && (
            <div className="tile stack-2">
              <div className="row row-between"><span className="t-strong" style={{ fontSize: 14 }}>Expense approval</span><span className="t-small">{e.approvalsCount} / {e.required} approvals</span></div>
              <Progress value={e.approvalsCount} max={e.required} tone="warning" label="Approvals" />
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="stack-1"><span className="t-label">Approved</span>{e.approvedBy.length ? e.approvedBy.map((p) => <span key={p.id} className="row-2" style={{ fontSize: 14 }}><CircleCheck size={15} aria-hidden style={{ color: "var(--success)" }} />{p.id === meId ? "You" : p.name}</span>) : <span className="t-small">No one yet</span>}</div>
                <div className="stack-1"><span className="t-label">Waiting</span>{e.waitingOn.map((p) => <span key={p.id} className="row-2" style={{ fontSize: 14, color: "var(--text-2)" }}><Avatar name={p.name} size="sm" me={p.id === meId} />{p.id === meId ? "You" : p.name}</span>)}</div>
              </div>
              <p className="t-small">It doesn't affect balances until it's confirmed.</p>
            </div>
          )}
          {e.flags?.filter(Boolean).length > 0 && status === "needs_review" && e.flags.map((f, i) => (
            <Notice key={i} tone="warning" title="Flagged for review">"{f.reason}"</Notice>
          ))}

          <table className="table">
            <thead><tr><th>Person</th><th className="right">Share</th></tr></thead>
            <tbody>{Object.entries(e.shares).map(([u, c]) => (
              <tr key={u}><td>{u === meId ? "You" : names[u] || "Former member"}</td><td className="right t-amount">{fmt(c, currency)}</td></tr>
            ))}</tbody>
            <tfoot><tr><td>Total</td><td className="right">{fmt(e.amount, currency)}</td></tr></tfoot>
          </table>

          <Disclosure summary="How was this calculated?">
            <ul className="t-small" style={{ margin: 0, paddingLeft: 18 }}>{(e.explanation || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
          </Disclosure>
          {(e.aiNotes?.length > 0 || e.receipt) && (
            <Disclosure summary="AI interpretation">
              <div className="panel panel-ai"><div className="panel-body stack-2 t-small">
                {e.aiConfidence != null && <span>Confidence: {e.aiConfidence >= 0.85 ? "High" : e.aiConfidence >= 0.65 ? "Medium" : "Low"}</span>}
                {e.aiNotes?.map((x, i) => <span key={i}>• {x}</span>)}
                {e.receipt?.items?.length > 0 && <span>Receipt items: {e.receipt.items.map((i) => `${i.name} ${fmt(i.amount, currency)}`).join(" · ")}</span>}
              </div></div>
            </Disclosure>
          )}

          {flagging && (
            <div className="stack-2">
              <Input value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="What needs a second look? e.g. wrong amount" aria-label="Reason for flagging" autoFocus />
              <div className="row-2"><Button size="sm" variant="secondary" onClick={() => act("flag", { reason })} loading={busy === "flag"}>Flag for review</Button><Button size="sm" variant="ghost" onClick={() => setFlagging(false)}>Cancel</Button></div>
            </div>
          )}
          {!e.deleted && !flagging && (
            <div className="row-2 row-wrap">
              {e.canApprove && <Button size="sm" icon={Check} onClick={() => act("approve")} loading={busy === "approve"}>Approve</Button>}
              {status === "needs_review" && (e.createdBy === meId || e.paidBy === meId) && <Button size="sm" icon={RotateCcw} onClick={() => act("resubmit")} loading={busy === "resubmit"}>Checked - resubmit</Button>}
              {e.canFlag && <Button size="sm" variant="secondary" icon={Flag} onClick={() => setFlagging(true)}>Flag for review</Button>}
              <span className="grow" />
              <span className="t-small">Added by {e.createdBy === meId ? "you" : e.createdByName} · {timeAgo(e.createdAt)}</span>
              {(e.createdBy === meId || e.paidBy === meId) && <Button size="sm" variant="danger" icon={Trash2} onClick={() => act("remove")} loading={busy === "remove"}>Remove</Button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Payment ----------------
export function PaymentItem({ s, meId, showGroup, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const toMe = s.toUserId === meId;
  const fromMe = s.fromUserId === meId;
  const [mLabel, MIcon] = PAY_METHOD[s.method] || PAY_METHOD.cash;
  async function act(action) {
    setBusy(action);
    try {
      await api(`/api/settlements/${s.id}`, { method: "POST", body: { action } });
      toast(action === "confirm" ? "Payment confirmed" : action === "reject" ? "Marked as not received" : "Payment disputed", action === "confirm" ? "success" : "info");
      onChanged?.(action);
    } catch (e) { toast(e.message, "error"); }
    setBusy("");
  }
  return (
    <div className="list-row row-wrap">
      <span className={"icon-tile " + (toMe ? "success" : "")}>{toMe ? <ArrowDownLeft size={18} aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}</span>
      <div className="grow stack-1" style={{ gap: 2, minWidth: 180 }}>
        <span className="t-strong">{fromMe ? "You" : firstName(s.fromName)} paid {toMe ? "you" : firstName(s.toName)}</span>
        <span className="t-small"><MIcon size={12} aria-hidden style={{ display: "inline", verticalAlign: -1 }} /> {mLabel}{showGroup && s.groupName ? ` · ${s.groupName}` : ""} · {timeAgo(s.createdAt)}{s.reference ? ` · Ref ${s.reference}` : ""}</span>
      </div>
      <span className={"t-amount" + (toMe ? " t-positive" : "")}>{fmt(s.amount, s.currency)}</span>
      <StatusBadge status={settlementStatus(s.status)} />
      {(s.proof || (toMe && (s.status === "pending_confirmation" || (s.method === "bank" && s.status === "completed")))) && (
        <div className="row-2 row-wrap" style={{ width: "100%", justifyContent: "flex-end" }}>
          {s.proof && <Button size="sm" variant="secondary" icon={FileText} href={`/api/uploads/${s.proof}`} target="_blank" rel="noreferrer">View proof</Button>}
          {toMe && s.status === "pending_confirmation" && (
            <>
              <Button size="sm" variant="secondary" onClick={() => act("reject")} loading={busy === "reject"}>Not received</Button>
              <Button size="sm" icon={Check} onClick={() => act("confirm")} loading={busy === "confirm"}>I received it</Button>
            </>
          )}
          {toMe && s.method === "bank" && s.status === "completed" && <Button size="sm" variant="danger" onClick={() => act("dispute")} loading={busy === "dispute"}>Dispute</Button>}
        </div>
      )}
    </div>
  );
}

// ---------------- Activity ----------------
const ACT_ICON = { joined: UserPlus, expense: Receipt, confirmed: CircleCheck, flag: Flag, payment: Banknote };
const ACT_STATUS = (a) => (a.type === "payment" ? settlementStatus(a.status) : a.type === "joined" ? null : a.status);
export function ActivityItem({ a, showGroup }) {
  const I = ACT_ICON[a.type] || Receipt;
  const st = ACT_STATUS(a);
  return (
    <div className="list-row row-top" style={{ alignItems: "flex-start" }}>
      <span className="icon-tile sm"><I size={16} aria-hidden /></span>
      <div className="grow stack-1" style={{ gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 14.5, color: "var(--navy)", lineHeight: 1.4 }}>{a.text}</span>
        <span className="row-2 row-wrap t-small" style={{ gap: 6 }}>
          {st && <StatusBadge status={st} />}
          <span>{showGroup && a.groupName ? `${a.groupName} · ` : ""}{timeAgo(a.at)}</span>
        </span>
      </div>
      {a.amount != null && <span className="t-amount">{fmt(a.amount, a.currency)}</span>}
    </div>
  );
}
