"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Send, Landmark, Receipt, ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import { Button, Card, CardHeader, PageHeader, Notice, Modal, Field, MoneyInput, Input, Chip, MemberSelect, Skeleton, EmptyState, Disclosure, Badge, useToast } from "@/components/ds";
import { api, timeAgo } from "@/lib/client.js";
import { fmt, toCents } from "@/lib/money.js";

const TX = {
  topup: ["Added from bank", ArrowDown], withdraw: ["Withdrawn to bank", ArrowUp], send: ["Sent", ArrowUpRight],
  receive: ["Received", ArrowDownLeft], pay: ["Paid a group expense", Receipt], receive_payment: ["Group payment received", ArrowDownLeft],
};

function ActionModal({ kind, data, meId, onClose, onDone }) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const title = { topup: "Add money", withdraw: "Withdraw to bank", send: "Send money" }[kind];
  async function submit() {
    setErr(""); setBusy(true);
    try {
      await api("/api/wallet", { method: "POST", body: { action: kind, amount: toCents(amount), toUserId: to, note } });
      toast(kind === "topup" ? `${fmt(toCents(amount))} added to your wallet` : kind === "withdraw" ? "Withdrawal on its way to your bank" : "Money sent", "success");
      onDone();
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title={title} onClose={onClose} footer={<><span className="grow" /><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy} disabled={!toCents(amount) || (kind === "send" && !to)}>{title}</Button></>}>
      <div className="stack-4">
        {err && <Notice tone="danger">{err}</Notice>}
        {kind === "send" && (data.contacts.length ? (
          <div className="stack-2"><span className="field-label">Send to</span><MemberSelect members={data.contacts} value={to} onChange={setTo} meId={meId} label="Send to" /></div>
        ) : <Notice tone="info">You can send money to people in your groups. Join or create a group first.</Notice>)}
        <Field label="Amount (MUR)" hint={kind === "withdraw" ? `Available: ${fmt(data.balance)}` : kind === "topup" && data.bank ? `From ${data.bank.bankName} ••${data.bank.last4}` : undefined}>
          {(id) => <MoneyInput id={id} large value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />}
        </Field>
        {kind === "topup" && <div className="row-2 row-wrap">{[50000, 100000, 250000, 500000].map((q) => <Chip key={q} onClick={() => setAmount(String(q / 100))}>{fmt(q)}</Chip>)}</div>}
        {kind === "send" && <Field label="Note (optional)">{(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's it for?" />}</Field>}
      </div>
    </Modal>
  );
}

function Wallet() {
  const app = useApp();
  const [d, setD] = useState(null);
  const [modal, setModal] = useState(null);
  const load = () => api("/api/wallet").then(setD);
  useEffect(() => { load(); }, [app.tick]);
  if (!d) return <main className="page stack-4"><Skeleton h={160} /><Skeleton h={300} /></main>;

  return (
    <main className="page stack-5">
      <PageHeader title="Wallet" subtitle="Money you hold in SplitSmart AI, kept separate from what you owe in groups." back={{ href: "/settlements", label: "Settlements" }} />
      <Notice tone="warning" title="Demo wallet">No payment provider is connected, so balances are simulated and no real money moves.</Notice>
      <div className="split">
        <div className="stack-5">
          <Card className="stack-4">
            <div className="stack-1"><span className="t-label">Wallet balance</span><span className="t-amount-xl" data-testid="wallet-balance">{fmt(d.balance)}</span><span className="t-small">Available to pay group expenses or send to friends</span></div>
            <div className="row-2 row-wrap">
              <Button icon={ArrowDown} onClick={() => setModal("topup")} disabled={!d.bank}>Add money</Button>
              <Button variant="secondary" icon={Send} onClick={() => setModal("send")}>Send</Button>
              <Button variant="secondary" icon={ArrowUp} onClick={() => setModal("withdraw")} disabled={!d.bank || !d.balance}>Withdraw</Button>
            </div>
            {!d.bank && <Notice tone="info" action={<Button size="sm" variant="secondary" href="/settings">Link bank</Button>}>Link a bank account to add money or withdraw.</Notice>}
          </Card>
          <Card pad={false}>
            <CardHeader title="Transactions" />
            <div className="card-body">
              {d.tx.length === 0 ? <EmptyState icon={WalletIcon} title="No transactions yet" /> : (
                <div className="list">{d.tx.map((t) => {
                  const [label, I] = TX[t.type] || ["Transaction", WalletIcon];
                  return (
                    <div className="list-row" key={t.id}>
                      <span className={"icon-tile sm" + (t.amount > 0 ? " success" : "")}><I size={16} aria-hidden /></span>
                      <div className="grow stack-1" style={{ gap: 0, minWidth: 0 }}><span className="t-strong ellipsis">{label}{t.counterpartyName ? ` · ${t.counterpartyName}` : ""}</span><span className="t-small ellipsis">{t.note} · {timeAgo(t.at)}</span></div>
                      <div className="stack-1 right" style={{ gap: 0 }}><span className={"t-amount" + (t.amount > 0 ? " t-positive" : "")}>{t.amount > 0 ? "+" : "−"}{fmt(Math.abs(t.amount))}</span><span className="t-small">Balance {fmt(t.balanceAfter)}</span></div>
                    </div>
                  );
                })}</div>
              )}
            </div>
          </Card>
        </div>
        <div className="stack-4">
          <Card className="stack-2">
            <span className="t-card">Linked bank</span>
            {d.bank ? <div className="row"><span className="icon-tile sm primary"><Landmark size={16} aria-hidden /></span><div className="stack-1" style={{ gap: 0 }}><span className="t-strong">{d.bank.bankName} ••{d.bank.last4}</span><span className="t-small">{d.bank.holder}</span></div></div> : <span className="t-small">No bank linked</span>}
            <Button size="sm" variant="secondary" href="/settings" style={{ alignSelf: "flex-start" }}>Manage</Button>
          </Card>
          <Card className="stack-2">
            <span className="t-card">Wallet or group balance?</span>
            <Disclosure summary="How they differ">
              <div className="stack-2 t-small">
                <p><b>Wallet balance</b> is money you've added to the app, e.g. "You have Rs 2,000 available".</p>
                <p><b>Group balance</b> is what you owe or are owed, e.g. "You owe Rs 500 to Sarah".</p>
                <p>When you settle up from your wallet, both change: your wallet goes down and the debt is marked as paid.</p>
              </div>
            </Disclosure>
          </Card>
        </div>
      </div>
      {modal && <ActionModal kind={modal} data={d} meId={app.me.id} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); app.refresh(); }} />}
    </main>
  );
}

export default function Page() {
  return <Shell><Wallet /></Shell>;
}
