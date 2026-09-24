"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import Shell from "@/components/Shell.js";
import { Button, Card, Field, Input, Select, Textarea, PageHeader, Notice, Radio, GroupIcon, GROUP_ICON_LABEL, useToast } from "@/components/ds";
import { api } from "@/lib/client.js";
import { CURRENCIES } from "@/lib/money.js";
import { RULES } from "@/lib/approval.js";
import { GROUP_ICONS } from "@/lib/icons-keys.js";

function NewGroup() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("users");
  const [currency, setCurrency] = useState("MUR");
  const [rule, setRule] = useState("majority");
  const [members, setMembers] = useState([{ name: "", email: "" }]);
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const upd = (i, k, v) => setMembers(members.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const count = members.filter((m) => m.email.trim()).length;

  function addBulk() {
    const rows = bulk.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const email = (l.match(/[^\s,;<>]+@[^\s,;<>]+/) || [""])[0];
      return { name: l.replace(email, "").replace(/[<>,;]/g, " ").trim() || email.split("@")[0], email };
    }).filter((r) => r.email);
    setMembers([...members.filter((m) => m.name || m.email), ...rows]);
    setBulk(""); setShowBulk(false);
    toast(`Added ${rows.length} ${rows.length === 1 ? "person" : "people"}`, "success");
  }

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const d = await api("/api/groups", { method: "POST", body: { name, icon, currency, approvalRule: rule, members: members.filter((m) => m.name || m.email) } });
      toast(d.invited ? `Group created. ${d.invited} invite${d.invited > 1 ? "s" : ""} sent.` : "Group created", "success");
      router.push(`/groups/${d.group.id}?invite=1`);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <main className="page page-narrow">
      <PageHeader title="Create a group" subtitle="Add as many people as you like. There's no member limit." back={{ href: "/groups", label: "Groups" }} />
      <form className="stack-5" onSubmit={submit}>
        {err && <Notice tone="danger">{err}</Notice>}
        <Card className="stack-4">
          <h2 className="t-card">Group details</h2>
          <Field label="Group name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grand Baie weekend" required />}</Field>
          <div className="field">
            <span className="field-label">Icon</span>
            <div className="row-2 row-wrap" role="radiogroup" aria-label="Group icon">
              {GROUP_ICONS.map((k) => (
                <button key={k} type="button" role="radio" aria-checked={icon === k} aria-label={GROUP_ICON_LABEL[k]} title={GROUP_ICON_LABEL[k]} className="choice" onClick={() => setIcon(k)}
                  style={{ width: 44, height: 44, padding: 0, justifyContent: "center", color: icon === k ? "var(--primary)" : "var(--text-2)" }}>
                  <GroupIcon icon={k} />
                </button>
              ))}
            </div>
          </div>
          <Field label="Currency">{(id) => <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>{Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{v.name} ({k})</option>)}</Select>}</Field>
        </Card>

        <Card className="stack-4">
          <div className="stack-1"><h2 className="t-card">Approvals</h2><p className="t-small">Who needs to approve a new expense before it changes balances?</p></div>
          <div className="stack-2" role="radiogroup" aria-label="Approval rule">
            {Object.entries(RULES).map(([k, label]) => (
              <button type="button" key={k} className="choice" role="radio" aria-checked={rule === k} onClick={() => setRule(k)}>
                <Radio on={rule === k} />
                <span className="grow stack-1" style={{ gap: 0 }}>
                  <span className="t-strong">{label}</span>
                  <span className="t-small">{k === "majority" ? "Recommended. More than half of the people in the expense approve it." : k === "all" ? "Everyone in the expense must approve it." : "Expenses count as soon as they're added."}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="stack-4">
          <div className="row row-between"><h2 className="t-card">Invite members <span className="t-small">({count})</span></h2>
            <Button type="button" variant="ghost" size="sm" icon={ClipboardList} onClick={() => setShowBulk(!showBulk)}>Paste a list</Button></div>
          {showBulk && (
            <div className="stack-2">
              <Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} aria-label="Paste members" placeholder={"One per line, e.g.\nPriya Nair, priya@demo.mu\nZoe Martin <zoe@demo.mu>"} />
              <Button type="button" variant="secondary" size="sm" onClick={addBulk} style={{ alignSelf: "flex-start" }}>Add these people</Button>
            </div>
          )}
          <div className="stack-2">
            {members.map((m, i) => (
              <div className="row-2" key={i}>
                <Input placeholder="Name" value={m.name} onChange={(e) => upd(i, "name", e.target.value)} aria-label={`Member ${i + 1} name`} />
                <Input type="email" placeholder="Email" value={m.email} onChange={(e) => upd(i, "email", e.target.value)} aria-label={`Member ${i + 1} email`} />
                <Button type="button" variant="ghost" icon={Trash2} aria-label={`Remove member ${i + 1}`} onClick={() => setMembers(members.length > 1 ? members.filter((_, j) => j !== i) : [{ name: "", email: "" }])} />
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" icon={Plus} onClick={() => setMembers([...members, { name: "", email: "" }])} style={{ alignSelf: "flex-start" }}>Add another member</Button>
          <p className="t-small">Each person gets an email invite. You'll also get a group code to share with anyone else.</p>
        </Card>

        <div className="row row-end">
          <Button type="button" variant="secondary" href="/groups">Cancel</Button>
          <Button type="submit" loading={busy}>{count ? `Create group and invite ${count}` : "Create group"}</Button>
        </div>
      </form>
    </main>
  );
}

export default function Page() {
  return <Shell><NewGroup /></Shell>;
}
