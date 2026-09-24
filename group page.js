"use client";
import { useEffect, useState } from "react";
import { Plus, KeyRound, Users } from "lucide-react";
import Shell, { useApp } from "@/components/Shell.js";
import { Button, Card, PageHeader, SearchInput, Skeleton, EmptyState } from "@/components/ds";
import JoinModal from "@/components/JoinModal.js";
import { GroupCard } from "@/components/blocks.js";
import { api } from "@/lib/client.js";

function Groups() {
  const app = useApp();
  const [groups, setGroups] = useState(null);
  const [q, setQ] = useState("");
  const [joining, setJoining] = useState(false);
  useEffect(() => { api("/api/groups").then((d) => setGroups(d.groups)); }, [app.tick]);
  const list = (groups || []).filter((g) => g.name.toLowerCase().includes(q.toLowerCase()) || g.memberNames.some((n) => n.toLowerCase().includes(q.toLowerCase())));

  return (
    <main className="page stack-5">
      <PageHeader title="Groups" subtitle="Everyone you share expenses with."
        actions={<><Button variant="secondary" icon={KeyRound} onClick={() => setJoining(true)}>Join with code</Button><Button icon={Plus} href="/groups/new">Create group</Button></>} />
      {groups && groups.length > 0 && <div style={{ maxWidth: 360 }}><SearchInput value={q} onChange={setQ} placeholder="Search groups or people" /></div>}
      {!groups ? <div className="grid-2"><Skeleton h={120} /><Skeleton h={120} /></div>
        : groups.length === 0 ? <Card><EmptyState icon={Users} title="No groups yet" text="Create a group and invite people by email, or join one with a code." action={<div className="row"><Button variant="secondary" onClick={() => setJoining(true)}>Join with code</Button><Button href="/groups/new">Create group</Button></div>} /></Card>
        : list.length === 0 ? <p className="t-secondary">No groups match "{q}".</p>
        : <div className="grid-2">{list.map((g) => <GroupCard key={g.id} g={g} />)}</div>}
      {joining && <JoinModal onClose={() => setJoining(false)} />}
    </main>
  );
}

export default function Page() {
  return <Shell><Groups /></Shell>;
}
