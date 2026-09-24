"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Modal, Notice, useToast } from "@/components/ds";
import { api } from "@/lib/client.js";

export default function JoinModal({ onClose, initial = "" }) {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState(initial);
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setInfo(null); setErr("");
    if (code.length === 6) api(`/api/join?code=${code}`).then(setInfo).catch((e) => setErr(e.message));
  }, [code]);
  async function join() {
    setBusy(true);
    try { const d = await api("/api/join", { method: "POST", body: { code } }); toast(`You joined ${info.group.name}`, "success"); onClose?.(); router.push(`/groups/${d.groupId}`); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="Join a group" subtitle="Enter the 6-character code someone shared with you." onClose={onClose}
      footer={<><span className="grow" /><Button variant="secondary" onClick={onClose}>Cancel</Button>{info?.already ? <Button href={`/groups/${info.group.id}`} onClick={onClose}>Open group</Button> : <Button onClick={join} loading={busy} disabled={!info}>Join group</Button>}</>}>
      <div className="stack-4">
        <input className="input code" style={{ height: 60 }} maxLength={6} value={code} autoFocus aria-label="Group code" placeholder="ABC123"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
        {err && <Notice tone="danger">{err}</Notice>}
        {info && <Notice tone="info" title={info.group.name}>{info.group.memberCount} members{info.already ? " · you're already a member" : ""}</Notice>}
      </div>
    </Modal>
  );
}

