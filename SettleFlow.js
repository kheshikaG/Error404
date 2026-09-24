"use client";
// Settle up: 1 who & how much -> 2 how you paid -> 3 verification -> 4 result + updated balance.
import { useEffect, useState } from "react";
import { Wallet, Landmark, Banknote, Upload, Check, ArrowLeft, FileText } from "lucide-react";
import { Modal, Button, Stepper, Field, Input, MoneyInput, Notice, StatusBadge, MemberSelect, Avatar, Radio, Spinner, Disclosure, useToast } from "@/components/ds";
import { api, fileToDataUrl, shrinkImage, firstName } from "@/lib/client.js";
import { fmt, toCents, CURRENCIES } from "@/lib/money.js";
import { GroupChooser } from "./AddExpenseFlow.js";

const STEPS = ["Amount", "Method", "Verify", "Done"];
const METHODS = [
  ["wallet", "Pay from my wallet", Wallet],
  ["bank", "Pay externally & upload proof", Landmark],
  ["cash", "Mark as cash payment", Banknote],
];

export default function SettleFlow({ groupId: gid0, to: to0, amount: amount0, method: method0, meId, walletBalance, onClose, onDone }) {
  const toast = useToast();
  const [groupId, setGroupId] = useState(gid0 || null);
  const [group, setGroup] = useState(null);
  const [step, setStep] = useState(gid0 ? 0 : -1);
  const [to, setTo] = useState(to0 || null);
  const [amountText, setAmountText] = useState(amount0 ? String(amount0 / 100) : "");
  const [method, setMethod] = useState(method0 || null);
  const [proof, setProof] = useState(null);
  const [proofName, setProofName] = useState("");
  const [reference, setReference] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = () => api(`/api/groups/${groupId}`).then((d) => setGroup(d.group));
  useEffect(() => { if (groupId) load().catch((e) => setErr(e.message)); }, [groupId]);

  if (step === -1) {
    return (
      <Modal title="Settle up" onClose={onClose} size="lg">
        <GroupChooser onPick={(id) => { setGroupId(id); setStep(0); }} />
      </Modal>
    );
  }
  if (!group) return <Modal title="Settle up" onClose={onClose}><div className="center"><Spinner /></div></Modal>;

  const cur = group.currency;
  const sym = CURRENCIES[cur]?.symbol || cur;
  const others = group.members.filter((m) => m.id !== meId);
  const owedTo = (uid) => group.plan.find((p) => p.from === meId && p.to === uid)?.amount || 0;
  const person = group.members.find((m) => m.id === to);
  const amount = toCents(amountText);
  const short = method === "wallet" && walletBalance < amount;

  async function pickProof(f) {
    if (!f) return;
    if (!/^image\/|application\/pdf/.test(f.type)) return setErr("Upload a screenshot (image) or a PDF of the payment.");
    if (f.size > 8 * 1024 * 1024) return setErr("That file is too big. The maximum is 8 MB.");
    setErr("");
    const d = await fileToDataUrl(f);
    setProof(f.type.startsWith("image/") ? await shrinkImage(d, 1800) : d);
    setProofName(f.name);
  }

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const { settlement } = await api("/api/settlements", { method: "POST", body: { groupId, toUserId: to, amount, method, proof, reference } });
      const d = await api(`/api/groups/${groupId}`);
      setGroup(d.group);
      setResult(settlement);
      setStep(3);
      onDone?.();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  let footer = null;
  if (step === 0) footer = <><span className="grow" /><Button onClick={() => setStep(1)} disabled={!to || !amount}>Continue</Button></>;
  if (step === 1) footer = <><Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(0)}>Back</Button><span className="grow" /><Button onClick={() => setStep(2)} disabled={!method}>Continue</Button></>;
  if (step === 2) footer = (
    <>
      <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>Back</Button>
      <span className="grow" />
      <Button onClick={submit} loading={busy} disabled={short || (method === "bank" && !proof)}>
        {method === "wallet" ? `Pay ${fmt(amount, cur)}` : method === "bank" ? "Submit payment proof" : `Ask ${firstName(person?.name)} to confirm`}
      </Button>
    </>
  );
  if (step === 3) footer = <><span className="grow" /><Button variant="secondary" href={`/groups/${groupId}`} onClick={onClose}>View group</Button><Button onClick={onClose}>Done</Button></>;

  const remaining = to ? group.plan.find((p) => p.from === meId && p.to === to)?.amount || 0 : 0;

  return (
    <Modal title="Settle up" subtitle={`in ${group.name}`} onClose={onClose} footer={footer}>
      <div className="stack-5">
        <Stepper steps={STEPS} current={step} />
        {err && <Notice tone="danger" title="We couldn't record this payment">{err}</Notice>}

        {step === 0 && (
          <div className="stack-4">
            {to && person ? (
              <div className="card card-pad center stack-2" style={{ background: "var(--bg)" }}>
                <div className="row" style={{ justifyContent: "center" }}><Avatar name={person.name} size="lg" /></div>
                <span className="t-secondary">{owedTo(to) ? `You owe ${person.name}` : `Pay ${person.name}`}</span>
                <span className="t-amount-xl">{fmt(amount || 0, cur)}</span>
                {!to0 && <Button variant="ghost" size="sm" onClick={() => setTo(null)} style={{ alignSelf: "center" }}>Change person</Button>}
              </div>
            ) : (
              <div className="stack-2">
                <span className="field-label">Who are you paying?</span>
                <MemberSelect members={others} value={to} meId={meId} label="Who are you paying"
                  describe={(m) => (owedTo(m.id) ? `You owe ${fmt(owedTo(m.id), cur)}` : "")}
                  onChange={(id) => { setTo(id); if (owedTo(id)) setAmountText(String(owedTo(id) / 100)); }} />
              </div>
            )}
            <Disclosure summary={to && owedTo(to) ? "Pay a different amount" : "Amount"} open={!owedTo(to)}>
              <Field label={`Amount (${cur})`}>{(id) => <MoneyInput id={id} large currencySymbol={sym} value={amountText} onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />}</Field>
            </Disclosure>
          </div>
        )}

        {step === 1 && (
          <div className="stack-2" role="radiogroup" aria-label="How did you pay">
            <span className="field-label">How are you paying {firstName(person?.name)} {fmt(amount, cur)}?</span>
            {METHODS.map(([k, label, I]) => (
              <button key={k} className="choice" role="radio" aria-checked={method === k} onClick={() => setMethod(k)}>
                <Radio on={method === k} />
                <span className="icon-tile sm primary"><I size={16} aria-hidden /></span>
                <span className="grow stack-1" style={{ gap: 0 }}>
                  <span className="t-strong">{label}</span>
                  <span className="t-small">
                    {k === "wallet" ? `Instant · wallet balance ${fmt(walletBalance)}` : k === "bank" ? "Bank transfer or app payment - attach a screenshot or PDF" : `${firstName(person?.name)} will be asked to confirm they received it`}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && method === "wallet" && (
          <div className="stack-4">
            <dl className="kv">
              <dt>To</dt><dd>{person?.name}</dd>
              <dt>Amount</dt><dd>{fmt(amount, cur)}</dd>
              <dt>Wallet now</dt><dd>{fmt(walletBalance)}</dd>
              <dt>Wallet after</dt><dd>{fmt(walletBalance - amount)}</dd>
            </dl>
            {short ? <Notice tone="warning" title="Not enough in your wallet" action={<Button size="sm" variant="secondary" href="/wallet" onClick={onClose}>Add money</Button>}>You need {fmt(amount - walletBalance)} more.</Notice>
              : <Notice tone="info">The payment is recorded instantly and the debt is marked as paid. Demo wallet - no real money moves.</Notice>}
          </div>
        )}

        {step === 2 && method === "bank" && (
          <div className="stack-4">
            <label className="dropzone">
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => pickProof(e.target.files[0])} aria-label="Upload payment proof" />
              {proof ? (
                <>
                  {proof.startsWith("data:image") ? <img src={proof} alt="Payment proof preview" className="thumb" style={{ maxHeight: 150 }} /> : <FileText size={32} aria-hidden />}
                  <span className="t-small">{proofName} · <span className="t-link">Replace</span></span>
                </>
              ) : (
                <>
                  <span className="icon-tile lg primary"><Upload size={22} aria-hidden /></span>
                  <span className="t-card">Upload payment proof</span>
                  <span className="t-small">Screenshot from your banking app, or a PDF. Max 8 MB.</span>
                </>
              )}
            </label>
            <Field label="Transfer reference" hint="Optional - helps the receiver find it.">{(id) => <Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. MCB-88213" />}</Field>
            <Notice tone="info">{firstName(person?.name)} can view the proof and dispute it if the money doesn't arrive.</Notice>
          </div>
        )}

        {step === 2 && method === "cash" && (
          <Notice tone="warning" title={`${firstName(person?.name)} needs to confirm`}>
            We'll send {firstName(person?.name)} a message. Until they confirm they received {fmt(amount, cur)}, it shows as <b>Awaiting confirmation</b> and your balance doesn't change.
          </Notice>
        )}

        {step === 3 && result && (
          <div className="stack-4 center">
            {result.status === "completed" ? <div className="success-mark"><Check size={32} aria-hidden /></div> : null}
            <div className="row" style={{ justifyContent: "center" }}>
              <StatusBadge status={result.status === "completed" ? "paid" : "awaiting_confirmation"} />
            </div>
            <p className="t-section">{result.status === "completed" ? "Payment confirmed" : `Waiting for ${firstName(person?.name)} to confirm`}</p>
            <div className="card card-pad-sm stack-1" style={{ background: "var(--bg)" }}>
              <span className="t-label">Your balance with {person?.name}</span>
              {remaining ? <span className="t-amount-lg">You owe {fmt(remaining, cur)}</span> : <span className="row-2" style={{ justifyContent: "center" }}><StatusBadge status="settled" /></span>}
              <span className="t-small">Your overall position in {group.name}: {group.myNet === 0 ? "settled" : group.myNet > 0 ? `you're owed ${fmt(group.myNet, cur)}` : `you owe ${fmt(-group.myNet, cur)}`}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
