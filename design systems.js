"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Receipt, Users, Mic, CreditCard, ShieldCheck, Activity, Settings, Sparkles, Camera, Wallet } from "lucide-react";
import { DemoBar, Logo } from "@/components/Shell.js";
import {
  Button, Card, CardHeader, PageHeader, Field, Input, Select, MoneyInput, SearchInput, Segmented, Tabs, Chip, Badge, StatusBadge,
  Amount, Avatar, AvatarStack, Notice, Progress, Stepper, Disclosure, ListRow, EmptyState, Skeleton, AiPanel, CalcPanel, ConfirmPanel,
  MemberPicker, LogoMark, Kpi,
} from "@/components/ds";
import { STATUS } from "@/lib/status.js";

const COLORS = [
  ["Primary · Smart Blue", "#2563EB", "Primary actions, active nav, links, selection"],
  ["Deep Navy", "#0F172A", "Headings, key financial figures, primary text"],
  ["Soft Blue", "#EFF6FF", "Information, AI areas, selected backgrounds"],
  ["Success", "#16A34A", "Confirmed, verified, positive balances"],
  ["Warning", "#F59E0B", "Pending, needs review, AI uncertainty"],
  ["Error", "#DC2626", "Errors, disputes, destructive actions only"],
  ["Background", "#F8FAFC", "Application background"],
  ["Card", "#FFFFFF", "Cards and surfaces"],
  ["Border", "#E2E8F0", "Borders and dividers"],
  ["Secondary text", "#64748B", "Supporting text"],
];
const DEMO_MEMBERS = ["Aarav Sharma", "Priya Nair", "Zoe Martin", "Sam Lee", "Ravi Doobur", "Kiran Patel", "Maya Chen", "Leo Dubois"].map((n, i) => ({ id: "m" + i, name: n }));

function Section({ title, children }) {
  return <section className="stack-4"><h2 className="t-section">{title}</h2>{children}</section>;
}

export default function DesignSystem() {
  const [seg, setSeg] = useState("equal");
  const [tab, setTab] = useState("a");
  const [sel, setSel] = useState(["m0", "m1", "m2"]);
  return (
    <div style={{ minHeight: "100vh" }}>
      <DemoBar />
      <div className="public-top"><Logo /><Button variant="secondary" href="/dashboard">Open app</Button></div>
      <main className="page stack-6" style={{ paddingTop: 8 }}>
        <PageHeader title="SplitSmart AI design system" subtitle="One set of tokens and components used by every screen. Clean fintech, approachable AI, transparent money, human confirmation." />

        <Section title="Logo">
          <div className="row row-wrap" style={{ gap: 24 }}>
            <Card className="row"><Logo /></Card>
            <Card style={{ background: "var(--navy)" }} className="row"><LogoMark size={32} color="#fff" /><span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>SplitSmart AI</span></Card>
            <span style={{ width: 56, height: 56, borderRadius: 14, background: "var(--primary)", display: "grid", placeItems: "center" }}><LogoMark size={34} color="#fff" /></span>
            <LogoMark size={20} color="var(--navy)" />
          </div>
          <p className="t-small">A loop of two connected segments: money moving fairly between people. Works in full colour, one colour, and as an app icon.</p>
        </Section>

        <Section title="Colour">
          <div className="grid-3">
            {COLORS.map(([n, hex, use]) => (
              <Card key={hex} pad="sm" className="stack-2"><div className="swatch" style={{ background: hex }} /><span className="t-strong">{n}</span><span className="t-small mono">{hex}</span><span className="t-small">{use}</span></Card>
            ))}
          </div>
          <Notice tone="info">Colour always carries meaning, never decoration. Badge text uses a deeper tint of green or amber for readable contrast. The brand colour is used for icons and borders.</Notice>
        </Section>

        <Section title="Typography · Inter">
          <Card className="stack-4">
            <span className="t-page">Page heading 28/700</span>
            <span className="t-section">Section heading 20/600</span>
            <span className="t-card">Card heading 16/600</span>
            <span className="t-body">Body 15/400. Clear, reassuring, concise and human.</span>
            <span className="t-secondary">Secondary 14/400 in #64748B</span>
            <div className="row row-wrap" style={{ gap: 32 }}>
              <Kpi label="You owe"><Amount cents={85000} size="xl" /></Kpi>
              <Kpi label="Owed to you"><Amount cents={120050} size="xl" tone="positive" /></Kpi>
              <Kpi label="Inline amount"><Amount cents={4500} /></Kpi>
            </div>
          </Card>
        </Section>

        <Section title="Spacing & radius">
          <div className="row row-wrap" style={{ alignItems: "flex-end" }}>
            {[4, 8, 12, 16, 24, 32, 48].map((s) => <div key={s} className="stack-1 center"><div style={{ width: s, height: s, background: "var(--primary)", borderRadius: 2 }} /><span className="t-small">{s}</span></div>)}
            <span className="grow" />
            {[["Buttons/inputs", 10], ["Cards", 14], ["Modals", 16]].map(([l, r]) => <div key={l} className="stack-1 center"><div style={{ width: 64, height: 44, border: "1.5px solid var(--primary)", borderRadius: r, background: "var(--soft-blue)" }} /><span className="t-small">{l} {r}px</span></div>)}
          </div>
        </Section>

        <Section title="Icons · Lucide">
          <div className="row row-wrap" style={{ gap: 20 }}>
            {[[Receipt, "Receipt"], [Users, "Group"], [Plus, "Add"], [Mic, "Voice"], [CreditCard, "Payment"], [ShieldCheck, "Verification"], [Activity, "Activity"], [Settings, "Settings"], [Sparkles, "AI"], [Camera, "Scan"], [Wallet, "Wallet"]].map(([I, l]) => (
              <div key={l} className="stack-1 center"><span className="icon-tile"><I size={20} aria-hidden /></span><span className="t-small">{l}</span></div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className="row row-wrap">
            <Button icon={Plus}>Primary</Button>
            <Button variant="secondary" icon={Pencil}>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={Trash2}>Destructive</Button>
            <Button loading>Processing</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Status system">
          <div className="row row-wrap">{Object.keys(STATUS).map((k) => <StatusBadge key={k} status={k} />)}</div>
          <p className="t-small">Every status pairs an icon and a label with its colour, so meaning never relies on colour alone.</p>
          <div className="row row-wrap"><Badge tone="info">Info</Badge><Badge tone="neutral">Neutral</Badge><Badge tone="success">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="danger">Error</Badge></div>
        </Section>

        <Section title="Forms">
          <Card className="grid-2">
            <Field label="Description" hint="Helper text sits under the field">{(id) => <Input id={id} placeholder="Dinner at Le Capitaine" />}</Field>
            <Field label="Amount (MUR)">{(id) => <MoneyInput id={id} placeholder="0.00" />}</Field>
            <Field label="Paid by">{(id) => <Select id={id}><option>You</option></Select>}</Field>
            <Field label="With an error" error="Enter an amount more than zero">{(id) => <Input id={id} aria-invalid="true" defaultValue="0" />}</Field>
            <div className="stack-2"><span className="field-label">Segmented control</span><Segmented options={[["equal", "Equally"], ["itemized", "By item"], ["exact", "Exact"]]} value={seg} onChange={setSeg} /></div>
            <div className="stack-2"><span className="field-label">Search</span><SearchInput value="" onChange={() => {}} placeholder="Search members" /></div>
          </Card>
          <Tabs value={tab} onChange={setTab} tabs={[["a", "Expenses", 2], ["b", "Balances"], ["c", "Activity"]]} />
          <div className="row-2"><Chip active>Selected chip</Chip><Chip>Chip</Chip></div>
        </Section>

        <Section title="Searchable member list (any group size)">
          <div style={{ maxWidth: 520 }}><MemberPicker members={DEMO_MEMBERS} selected={sel} onChange={setSel} meId="m0" renderValue={() => <Amount cents={Math.round(300000 / Math.max(sel.length, 1))} />} /></div>
        </Section>

        <Section title="AI interpretation vs. calculation vs. confirmation">
          <div className="stack-4" style={{ maxWidth: 640 }}>
            <AiPanel step={1} source="Built-in AI" confidence={0.72}>
              <StatusBadge status="needs_review" />
              <p className="t-strong" style={{ fontSize: 14 }}>Some details need a second look.</p>
              <dl className="kv"><dt>Merchant</dt><dd>Cafe Latitude</dd><dt>Total</dt><dd>Rs 2,543</dd><dt>Currency</dt><dd>Not printed, using MUR</dd></dl>
            </AiPanel>
            <CalcPanel step={2}><p className="t-small">Exact shares in cents that always add up to the total.</p></CalcPanel>
            <ConfirmPanel step={3}><Notice tone="warning" title="It will need approval">It stays Pending approval until 2 of 3 people approve.</Notice></ConfirmPanel>
          </div>
        </Section>

        <Section title="Feedback & disclosure">
          <div className="grid-2">
            <Notice tone="info" title="Information">Neutral guidance.</Notice>
            <Notice tone="success" title="Payment confirmed">Balances are updated.</Notice>
            <Notice tone="warning" title="Waiting for approval">2 of 3 required members have approved.</Notice>
            <Notice tone="danger" title="We couldn't verify this payment.">Check the amount and upload the proof again.</Notice>
          </div>
          <Card className="stack-4">
            <Stepper steps={["Method", "Details", "Review", "Recorded"]} current={2} />
            <div className="stack-2"><div className="row row-between t-small"><span>Expense approval</span><span>2 / 3 approvals</span></div><Progress value={2} max={3} tone="warning" /></div>
            <Disclosure summary="How was this calculated?"><p className="t-small">Progressive disclosure keeps detail hidden until it's needed.</p></Disclosure>
            <div className="row"><AvatarStack names={DEMO_MEMBERS.map((m) => m.name)} /><Avatar name="You Me" me /></div>
            <Skeleton h={14} w="60%" />
          </Card>
        </Section>

        <Section title="Cards & lists">
          <div className="grid-2">
            <Card pad={false}><CardHeader title="Card with header" subtitle="Subtitle" action={<Button size="sm" variant="ghost">Action</Button>} />
              <div className="card-body list"><ListRow leading={<Avatar name="Priya Nair" />} title="Priya Nair" subtitle="Grand Baie Weekend" trailing={<StatusBadge status="awaiting_payment" />} /><ListRow leading={<Avatar name="Zoe Martin" />} title="Zoe Martin" subtitle="Friday Dinner" trailing={<StatusBadge status="settled" />} /></div>
            </Card>
            <Card><EmptyState icon={Receipt} title="Empty state" text="Explains what goes here and offers the next step." action={<Button size="sm">Primary action</Button>} /></Card>
          </div>
        </Section>
      </main>
    </div>
  );
}
