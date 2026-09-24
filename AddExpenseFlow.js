"use client";
// Unified Add Expense flow: receipt scan, typing, voice, manual entry and payment proof.
// Steps: Method -> Details -> Review -> Recorded.
// Review keeps three things visibly separate: AI interpretation, the exact calculation, and the user's confirmation.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Keyboard, Mic, PenLine, FileCheck, Upload, Receipt, Users, Check, Square, Plus, Trash2, ArrowLeft } from "lucide-react";
import {
  Modal, Button, Stepper, Field, Input, Select, Textarea, MoneyInput, Segmented, Notice, StatusBadge, Progress, Chip,
  AiPanel, CalcPanel, ConfirmPanel, MemberPicker, Avatar, AvatarStack, Disclosure, SearchInput, EmptyState, Spinner,
  GroupIcon, useToast,
} from "@/components/ds";
import { api, fileToDataUrl, shrinkImage, firstName } from "@/lib/client.js";
import { computeShares, fmt, toCents, CURRENCIES } from "@/lib/money.js";
import { assignItems } from "@/lib/assign.js";
import { voters, requiredApprovals } from "@/lib/approval.js";
import { useSpeech } from "./speech.js";
import { readReceiptText } from "./ocr.js";

const STEPS = ["Method", "Details", "Review", "Recorded"];
const METHODS = [
  ["scan", "Scan a receipt", "Snap or upload a bill - AI reads every item.", Camera],
  ["type", "Type it", '"I paid Rs 1200 for dinner with Priya and Zoe"', Keyboard],
  ["voice", "Say it", "Speak the expense - you'll review it before saving.", Mic],
  ["manual", "Enter manually", "Fill in the amount and choose the split yourself.", PenLine],
  ["proof", "Payment proof", "Record a payment you already made and attach proof.", FileCheck],
];
const SPLITS = [["equal", "Equally"], ["itemized", "By item"], ["exact", "Exact amounts"], ["percent", "Percent"], ["shares", "Shares"]];
const today = () => new Date().toISOString().slice(0, 10);

function blank(group, meId) {
  return {
    description: "", amountText: "", date: today(), paidBy: meId, participants: group.members.map((m) => m.id),
    method: "equal", details: {}, items: [], extrasMode: "proportional", source: "manual",
    aiNotes: [], warnings: [], receipt: null, confidence: null, aiSource: null, detected: null,
  };
}

// ---------------- Step 0a: choose a group ----------------
export function GroupChooser({ onPick }) {
  const [groups, setGroups] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { api("/api/groups").then((d) => setGroups(d.groups)).catch(() => setGroups([])); }, []);
  if (!groups) return <div className="center" style={{ padding: 32 }}><Spinner /></div>;
  if (!groups.length) return <EmptyState icon={Users} title="Create a group first" text="Expenses are shared inside a group. Create one and invite people - there's no member limit." action={<Button href="/groups/new">Create a group</Button>} />;
  const list = groups.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="stack">
      <p className="t-secondary">Which group is this expense for?</p>
      {groups.length > 5 && <SearchInput value={q} onChange={setQ} placeholder="Search groups" />}
      <div className="picker"><div className="picker-list" style={{ maxHeight: 340 }}>
        {list.map((g) => (
          <button key={g.id} className="picker-row" onClick={() => onPick(g.id)}>
            <span className="icon-tile sm primary"><GroupIcon icon={g.icon} size={16} /></span>
            <span className="grow stack-1" style={{ gap: 0 }}>
              <span className="t-strong">{g.name}</span>
              <span className="t-small">{g.memberCount} members</span>
            </span>
          </button>
        ))}
      </div></div>
    </div>
  );
}

export default function AddExpenseFlow({ groupId: initialGroup, meId, aiMode, onClose, onDone, onPaymentProof }) {
  const toast = useToast();
  const [groupId, setGroupId] = useState(initialGroup || null);
  const [group, setGroup] = useState(null);
  const [step, setStep] = useState(initialGroup ? "method" : "group");
  const [method, setMethod] = useState(null);
  const [draft, setDraft] = useState(null);
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(null); // null | { label, progress }
  const [err, setErr] = useState("");
  const [img, setImg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [whoText, setWhoText] = useState("");
  const [openItem, setOpenItem] = useState(null);
  const fileRef = useRef();

  const speech = useSpeech((t) => setText(t));
  const whoSpeech = useSpeech((t) => setWhoText(t));

  useEffect(() => {
    if (!groupId) return;
    api(`/api/groups/${groupId}`).then((d) => { setGroup(d.group); setDraft(blank(d.group, meId)); }).catch((e) => setErr(e.message));
  }, [groupId, meId]);

  const cur = group?.currency || "MUR";
  const sym = CURRENCIES[cur]?.symbol || cur;
  const members = group?.members || [];
  const names = Object.fromEntries(members.map((m) => [m.id, m.id === meId ? "You" : firstName(m.name)]));
  const setD = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const amount = toCents(draft?.amountText);

  // ---------- live, deterministic calculation ----------
  const calc = useMemo(() => {
    if (!draft) return {};
    try {
      let details = draft.details;
      if (draft.method === "itemized") details = { items: draft.items.map((i) => ({ name: i.name, amount: toCents(i.amountText), people: i.people })), extrasMode: draft.extrasMode };
      const r = computeShares(amount, draft.method, draft.participants, details, names);
      return { ...r, details };
    } catch (e) { return { error: e.message }; }
  }, [draft, amount]);

  // ---------- AI: typed / spoken ----------
  async function interpret(source) {
    setErr(""); setProcessing({ label: "Processing your expense…" }); setStep("input");
    try {
      const { proposal: p, warnings } = await api("/api/ai/parse", { method: "POST", body: { groupId, text } });
      setDraft({
        ...blank(group, meId), description: p.description, amountText: p.amount ? String(p.amount / 100) : "", paidBy: p.paidBy,
        participants: p.participants, method: p.method, details: p.details || {}, source, aiNotes: p.notes || [], warnings,
        confidence: p.confidence, aiSource: p.source, category: p.category,
        detected: { Description: p.description, Amount: p.amount ? fmt(p.amount, cur) : "Not found", "Paid by": names[p.paidBy], "Split between": `${p.participants.length} ${p.participants.length === 1 ? "person" : "people"}`, "Split type": SPLITS.find((s) => s[0] === p.method)?.[1] },
      });
      setStep("review");
    } catch (e) { setErr(e.message); }
    setProcessing(null);
  }

  // ---------- AI: receipt ----------
  async function scan(dataUrl) {
    setErr(""); setStep("input");
    const small = await shrinkImage(dataUrl);
    setImg(small);
    setProcessing({ label: "AI is reading your receipt", progress: 5 });
    try {
      let ocrText = "";
      if (aiMode !== "claude") ocrText = await readReceiptText(small, (p) => setProcessing({ label: "AI is reading your receipt", progress: Math.max(5, p) }));
      let r;
      try {
        r = (await api("/api/ai/receipt", { method: "POST", body: { image: aiMode === "claude" ? small : undefined, ocrText } })).receipt;
      } catch (e) {
        if (aiMode === "claude" && !ocrText) {
          ocrText = await readReceiptText(small, (p) => setProcessing({ label: "AI is reading your receipt", progress: p }));
          r = (await api("/api/ai/receipt", { method: "POST", body: { ocrText } })).receipt;
        } else throw e;
      }
      const notes = [];
      if (r.extras) notes.push(`Found ${fmt(r.extras, cur)} of tax / service charge. It's shared in proportion to what each person had.`);
      if (!r.reconciles) notes.push("The items don't add up exactly to the total - please check the numbers.");
      const warnings = [];
      if (r.currency && r.currency !== cur) warnings.push(`The receipt looks like it's in ${r.currency}, but this group uses ${cur}. Check the amounts before confirming.`);
      const merchant = r.merchant ? r.merchant.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40) : "";
      setDraft({
        ...blank(group, meId), description: merchant || "Receipt", amountText: String(r.total / 100), date: r.date || today(),
        method: r.items.length ? "itemized" : "equal", items: r.items.map((i) => ({ name: i.name, amountText: String(i.amount / 100), people: [] })),
        source: "receipt", aiNotes: notes, warnings, receipt: { merchant: r.merchant, date: r.date, items: r.items }, reconciles: r.reconciles,
        confidence: r.reconciles && merchant ? 0.9 : 0.62, aiSource: r.source === "claude" ? "claude" : "built-in",
        detected: {
          Merchant: merchant || "Not found", Date: r.date ? new Date(r.date + "T12:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not found - using today",
          Currency: r.currency || `Not printed - using ${cur}`, Total: fmt(r.total, cur), Items: `${r.items.length} found`,
        },
        currencyMissing: !r.currency,
      });
      setStep("review");
    } catch (e) { setErr(e.message || "We couldn't read that receipt."); setStep("input"); }
    setProcessing(null);
  }
  async function pickFile(f) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Please choose a photo of the receipt (JPG or PNG).");
    scan(await fileToDataUrl(f));
  }
  async function sample() {
    const blob = await (await fetch("/samples/receipt-cafe.png")).blob();
    scan(await fileToDataUrl(blob));
  }

  function chooseMethod(m) {
    setErr("");
    if (m === "proof") return onPaymentProof(groupId);
    setMethod(m);
    if (m === "manual") { setDraft(blank(group, meId)); setStep("review"); }
    else setStep("input");
  }

  function applyWho() {
    const items = draft.items.map((i) => ({ ...i, amount: toCents(i.amountText) }));
    const { items: out, hits } = assignItems(whoText, items, members.filter((m) => draft.participants.includes(m.id)), meId);
    setD({ items: out });
    toast(hits ? `Matched ${hits} item${hits > 1 ? "s" : ""} - check them below` : "We couldn't match any items. Try the item names from the receipt.", hits ? "success" : "error");
  }

  async function confirm() {
    setErr(""); setSaving(true);
    try {
      const { expense } = await api(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        body: {
          description: draft.description, amount, date: draft.date, paidBy: draft.paidBy, participants: draft.participants, method: draft.method,
          details: calc.details, source: draft.source, aiNotes: draft.aiNotes, aiConfidence: draft.confidence, receipt: draft.receipt, category: draft.category,
        },
      });
      setSaved(expense);
      setStep("done");
      onDone?.();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  const stepIndex = { group: 0, method: 0, input: 1, review: 2, done: 3 }[step];
  const isAi = draft && draft.source !== "manual";
  const needsReview = isAi && (draft.confidence < 0.8 || draft.warnings.length > 0 || draft.reconciles === false || !amount);
  const v = draft ? voters({ participants: draft.participants, paidBy: draft.paidBy }) : [];
  const required = requiredApprovals(group?.approvalRule || "majority", v.length);
  const autoConfirm = required === 0 || (required === 1 && v.includes(meId));
  let n = 0;

  // ---------------- footer per step ----------------
  let footer = null;
  if (step === "review") {
    footer = (
      <>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => (method === "manual" ? setStep("method") : setStep("input"))}>Back</Button>
        <span className="grow" />
        <Button onClick={confirm} loading={saving} disabled={!!calc.error || !draft.description.trim()}>Confirm expense{amount ? ` · ${fmt(amount, cur)}` : ""}</Button>
      </>
    );
  }

  return (
    <Modal title={step === "done" ? "Expense recorded" : "Add expense"} subtitle={group ? `in ${group.name}` : undefined} onClose={onClose} size="lg" footer={footer}>
      <div className="stack-5">
        <Stepper steps={STEPS} current={stepIndex} />
        {err && <Notice tone="danger" title="Something went wrong">{err}</Notice>}

        {step === "group" && <GroupChooser onPick={(id) => { setGroupId(id); setStep("method"); }} />}

        {step === "method" && (!group ? <div className="center"><Spinner /></div> : (
          <div className="stack">
            <p className="t-secondary">How do you want to add it?</p>
            <div className="method-grid">
              {METHODS.map(([k, t, d, I]) => (
                <button key={k} className="method" onClick={() => chooseMethod(k)}>
                  <span className="icon-tile primary"><I size={20} aria-hidden /></span>
                  <span className="t-card">{t}</span>
                  <span className="t-small">{d}</span>
                </button>
              ))}
            </div>
            {!initialGroup && <Button variant="ghost" size="sm" onClick={() => setStep("group")} style={{ alignSelf: "flex-start" }}>Change group</Button>}
          </div>
        ))}

        {/* ---------------- Details / processing ---------------- */}
        {step === "input" && processing && (
          <div className="stack center" style={{ padding: "8px 0" }}>
            {img && method === "scan" && <img src={img} alt="Receipt being read" className="thumb" style={{ maxHeight: 160 }} />}
            <div className="row" style={{ justifyContent: "center" }}><StatusBadge status="processing" /></div>
            <p className="t-card">{processing.label}</p>
            {processing.progress != null && <Progress value={processing.progress} label="Reading progress" />}
            <p className="t-small">{method === "scan" && aiMode !== "claude" ? "Runs on this device - the first scan takes a few seconds." : "You'll review everything before it's saved."}</p>
          </div>
        )}

        {step === "input" && !processing && method === "scan" && (
          <div className="stack">
            <label className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pickFile(e.target.files[0])} />
              <span className="icon-tile lg primary"><Upload size={22} aria-hidden /></span>
              <span className="t-card">Upload receipt</span>
              <span className="t-small">Take a photo or choose an image. JPG or PNG.</span>
            </label>
            <Button variant="secondary" icon={Receipt} onClick={sample}>Try the sample receipt</Button>
          </div>
        )}

        {step === "input" && !processing && (method === "type" || method === "voice") && (
          <div className="stack">
            {method === "voice" && (
              <div className="stack center" style={{ padding: "8px 0" }}>
                {speech.supported ? (
                  <>
                    <button className={"mic" + (speech.live ? " live" : "")} onClick={speech.toggle} aria-label={speech.live ? "Stop recording" : "Start recording"}>
                      {speech.live ? <Square size={24} fill="currentColor" aria-hidden /> : <Mic size={28} aria-hidden />}
                    </button>
                    <p className="t-card" aria-live="polite">{speech.live ? "Listening…" : text ? "Recording finished" : "Tap to start speaking"}</p>
                    <p className="t-small">Try: “I paid 600 for the taxi, split with Zoe”</p>
                  </>
                ) : <Notice tone="warning" title="Voice isn't available in this browser">Use Chrome or Edge for voice, or type the expense below.</Notice>}
              </div>
            )}
            <Field label={method === "voice" ? "What we heard (you can edit it)" : "Describe the expense"}>
              {(id) => <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder='e.g. "Zoe paid Rs 900 for the taxi, everyone except Sam"' />}
            </Field>
            {method === "type" && (
              <div className="row-2 row-wrap">
                {["I paid Rs 1200 for dinner, split with everyone", `Taxi 450, everyone except ${firstName(members.find((m) => m.id !== meId)?.name || "Sam")}`, `Groceries 800, shares me 2 ${firstName(members.find((m) => m.id !== meId)?.name || "Zoe")} 1`].map((ex) => (
                  <Chip key={ex} onClick={() => setText(ex)}>{ex}</Chip>
                ))}
              </div>
            )}
            <div className="row row-between">
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep("method")}>Back</Button>
              <Button onClick={() => interpret(method === "voice" ? "voice" : "text")} disabled={text.trim().length < 3 || speech.live}>Review AI interpretation</Button>
            </div>
          </div>
        )}

        {/* ---------------- Review ---------------- */}
        {step === "review" && draft && (
          <div className="stack-5">
            {isAi && (
              <AiPanel step={++n} title="AI interpretation" source={draft.aiSource === "claude" ? "Claude" : "Built-in AI"} confidence={draft.confidence}>
                <div className="row-2 row-wrap">
                  {needsReview ? <StatusBadge status="needs_review" /> : <StatusBadge status="pending_approval" label="AI suggestion · please review" />}
                </div>
                {needsReview && <p className="t-strong" style={{ fontSize: 14 }}>Some details need a second look.</p>}
                <dl className="kv">
                  {Object.entries(draft.detected || {}).map(([k, val]) => (<Fragment key={k}><dt>{k}</dt><dd>{val}</dd></Fragment>))}
                </dl>
                {draft.currencyMissing && <Notice tone="info">We couldn't confidently identify the currency on the receipt, so it's recorded in the group currency ({cur}).</Notice>}
                {draft.warnings.map((w, i) => <Notice key={i} tone="warning">{w}</Notice>)}
                {draft.aiNotes.length > 0 && (
                  <Disclosure summary={`What the AI assumed (${draft.aiNotes.length})`}>
                    <ul className="t-small" style={{ margin: 0, paddingLeft: 18 }}>{draft.aiNotes.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </Disclosure>
                )}
                {img && draft.source === "receipt" && <Disclosure summary="View receipt photo"><img src={img} alt="Scanned receipt" className="thumb" /></Disclosure>}
              </AiPanel>
            )}

            <section className="stack-4" aria-label="Expense details">
              <div className="row-2"><span className="step-no">{++n}</span><h3 className="t-card">{isAi ? "Check and edit the details" : "Expense details"}</h3></div>
              <div className="grid-2">
                <Field label="Description">{(id) => <Input id={id} value={draft.description} onChange={(e) => setD({ description: e.target.value })} placeholder="e.g. Dinner at Le Capitaine" />}</Field>
                <Field label={`Total (${cur})`}>{(id) => <MoneyInput id={id} currencySymbol={sym} value={draft.amountText} onChange={(e) => setD({ amountText: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0.00" />}</Field>
                <Field label="Date">{(id) => <Input id={id} type="date" value={draft.date} max={today()} onChange={(e) => setD({ date: e.target.value })} />}</Field>
                <Field label="Paid by">
                  {(id) => (
                    <Select id={id} value={draft.paidBy} onChange={(e) => setD({ paidBy: e.target.value })}>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.id === meId ? `You (${m.name})` : m.name}</option>)}
                    </Select>
                  )}
                </Field>
              </div>
              <div className="stack-2">
                <span className="field-label">How should it be split?</span>
                <Segmented label="Split type" options={SPLITS} value={draft.method}
                  onChange={(k) => setD({ method: k, items: k === "itemized" && !draft.items.length ? [{ name: "", amountText: "", people: [] }] : draft.items })} />
              </div>
              <div className="stack-2">
                <span className="field-label">Split between</span>
                <MemberPicker
                  members={members} selected={draft.participants} meId={meId} label="Split between"
                  onChange={(p) => setD({ participants: p })}
                  renderControl={
                    draft.method === "exact" ? (m) => <MoneyInput currencySymbol={sym} small width={130} aria-label={`Amount for ${m.name}`} value={draft.details.amounts?.[m.id] != null ? draft.details.amounts[m.id] / 100 : ""} onChange={(e) => setD({ details: { ...draft.details, amounts: { ...(draft.details.amounts || {}), [m.id]: toCents(e.target.value) } } })} />
                    : draft.method === "percent" ? (m) => <Input size="sm" style={{ width: 76 }} aria-label={`Percent for ${m.name}`} placeholder="%" value={draft.details.percents?.[m.id] ?? ""} onChange={(e) => setD({ details: { ...draft.details, percents: { ...(draft.details.percents || {}), [m.id]: e.target.value.replace(/[^\d.]/g, "") } } })} />
                    : draft.method === "shares" ? (m) => <Input size="sm" style={{ width: 64 }} aria-label={`Shares for ${m.name}`} value={draft.details.shares?.[m.id] ?? 1} onChange={(e) => setD({ details: { ...draft.details, shares: { ...(draft.details.shares || {}), [m.id]: e.target.value.replace(/[^\d.]/g, "") } } })} />
                    : null
                  }
                />
              </div>

              {draft.method === "itemized" && (
                <div className="stack">
                  <span className="field-label">Choose who shared each item</span>
                  <div className="panel panel-ai">
                    <div className="panel-body stack-2">
                      <span className="t-small" style={{ color: "var(--primary-hover)", fontWeight: 600 }}>Tell us who had what (optional)</span>
                      <div className="row-2">
                        <Input value={whoText} onChange={(e) => setWhoText(e.target.value)} placeholder='e.g. "Zoe had the burger, Priya and I shared the pizza"' aria-label="Who had what" />
                        {whoSpeech.supported && <Button variant="secondary" icon={Mic} onClick={whoSpeech.toggle} aria-label={whoSpeech.live ? "Stop" : "Say who had what"} />}
                        <Button variant="secondary" onClick={applyWho} disabled={!whoText.trim()}>Apply</Button>
                      </div>
                    </div>
                  </div>
                  <div className="list" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px" }}>
                    {draft.items.map((it, i) => {
                      const people = (it.people || []).filter((p) => draft.participants.includes(p));
                      return (
                        <div key={i} className="list-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                          <div className="row-2">
                            <Input size="sm" value={it.name} placeholder="Item" aria-label={`Item ${i + 1} name`} onChange={(e) => setD({ items: draft.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                            <MoneyInput currencySymbol={sym} small width={130} aria-label={`Item ${i + 1} price`} value={it.amountText} onChange={(e) => setD({ items: draft.items.map((x, j) => (j === i ? { ...x, amountText: e.target.value.replace(/[^\d.]/g, "") } : x)) })} />
                            <Button variant="ghost" size="sm" icon={Trash2} aria-label="Remove item" onClick={() => setD({ items: draft.items.filter((_, j) => j !== i) })} />
                          </div>
                          <div className="row-2">
                            {people.length ? <AvatarStack names={people.map((p) => members.find((m) => m.id === p)?.name || "")} max={6} /> : <Users size={16} aria-hidden style={{ color: "var(--text-2)" }} />}
                            <span className="t-small grow">{people.length ? people.map((p) => names[p]).join(", ") : "Shared by everyone"}</span>
                            <Button variant="ghost" size="sm" onClick={() => setOpenItem(openItem === i ? null : i)}>{openItem === i ? "Done" : "Choose people"}</Button>
                          </div>
                          {openItem === i && (
                            <MemberPicker members={members.filter((m) => draft.participants.includes(m.id))} selected={people} meId={meId} label={`Who shared ${it.name || "this item"}`}
                              onChange={(p) => setD({ items: draft.items.map((x, j) => (j === i ? { ...x, people: p } : x)) })} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="row row-between row-wrap">
                    <Button variant="secondary" size="sm" icon={Plus} onClick={() => setD({ items: [...draft.items, { name: "", amountText: "", people: [] }] })}>Add item</Button>
                    <label className="row-2 t-small">Tax, service and tip:
                      <Select style={{ width: "auto", height: 34 }} value={draft.extrasMode} onChange={(e) => setD({ extrasMode: e.target.value })}>
                        <option value="proportional">In proportion to items</option>
                        <option value="equal">Split equally</option>
                      </Select>
                    </label>
                  </div>
                </div>
              )}
            </section>

            <CalcPanel step={++n}>
              {calc.error ? (
                <Notice tone="warning" title="The split doesn't add up yet">{calc.error}</Notice>
              ) : (
                <>
                  <table className="table">
                    <thead><tr><th>Person</th><th className="right">Share</th></tr></thead>
                    <tbody>
                      {Object.entries(calc.shares).map(([u, c]) => (
                        <tr key={u}><td><span className="row-2"><Avatar name={members.find((m) => m.id === u)?.name || "?"} size="sm" me={u === meId} />{names[u]}</span></td><td className="right t-amount">{fmt(c, cur)}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><tr><td><span className="row-2"><Check size={16} aria-hidden style={{ color: "var(--success)" }} />Adds up exactly</span></td><td className="right">{fmt(amount, cur)}</td></tr></tfoot>
                  </table>
                  <Disclosure summary="How was this calculated?">
                    <ul className="t-small" style={{ margin: 0, paddingLeft: 18 }}>{calc.explanation.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </Disclosure>
                </>
              )}
            </CalcPanel>

            <ConfirmPanel step={++n}>
              <p className="t-body">
                <b>{names[draft.paidBy]}</b> paid <b>{amount ? fmt(amount, cur) : "—"}</b> for <b>{draft.description || "this expense"}</b>, shared by {draft.participants.length} {draft.participants.length === 1 ? "person" : "people"}.
              </p>
              {autoConfirm ? (
                <Notice tone="success">It will be confirmed straight away and balances will update.</Notice>
              ) : (
                <Notice tone="warning" title="It will need approval">
                  It stays <b>Pending approval</b> until {required} of the {v.length} people involved approve{v.includes(meId) ? " (your confirmation counts as one)" : ""}. Balances only change once it's confirmed.
                </Notice>
              )}
            </ConfirmPanel>
          </div>
        )}

        {/* ---------------- Done ---------------- */}
        {step === "done" && saved && (
          <div className="stack-4 center" style={{ padding: "8px 0 4px" }}>
            <div className="success-mark"><Check size={32} aria-hidden /></div>
            <div className="stack-2">
              <p className="t-section">{saved.description} · {fmt(saved.amount, saved.currency)}</p>
              <div className="row" style={{ justifyContent: "center" }}>
                <StatusBadge status={saved.status} detail={saved.status === "pending_approval" ? `${saved.approvals.length} of ${saved.required} approvals` : undefined} />
              </div>
              <p className="t-secondary">
                {saved.status === "confirmed" ? "Balances in the group are updated." : "We've asked the others to approve it. You'll get a notification when it's confirmed."}
              </p>
            </div>
            <div className="row" style={{ justifyContent: "center" }}>
              <Button variant="secondary" onClick={() => { setDraft(blank(group, meId)); setText(""); setImg(null); setSaved(null); setStep("method"); }}>Add another</Button>
              <Button href={`/groups/${groupId}`} onClick={onClose}>View group</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
