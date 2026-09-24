"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthLayout from "@/components/AuthLayout.js";
import { Button, Notice, Spinner, AvatarStack, GroupIcon, useToast } from "@/components/ds";
import { api } from "@/lib/client.js";

export default function Invite() {
  const { token } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    api(`/api/invites/${token}`).then(setD).catch((e) => setErr(e.message));
    try { sessionStorage.setItem("ss_next", `/invite/${token}`); } catch {}
  }, [token]);

  async function act(action) {
    setBusy(action);
    try {
      const r = await api(`/api/invites/${token}`, { method: "POST", body: { action } });
      try { sessionStorage.removeItem("ss_next"); } catch {}
      if (action === "decline") { toast("Invite declined", "info"); router.push("/dashboard"); }
      else { toast(`Welcome to ${d.group.name}`, "success"); router.push(`/groups/${r.groupId}`); }
    } catch (e) { setErr(e.message); setBusy(""); }
  }

  if (!d && !err) return <div className="auth"><Spinner size={28} /></div>;
  if (!d) return <AuthLayout title="Invite not found"><Notice tone="danger">{err}</Notice><Button href="/">Go home</Button></AuthLayout>;

  return (
    <AuthLayout title={d.group.name} subtitle={`${d.invite.invitedBy} invited you to split expenses in this group.`}>
      <div className="stack-4">
        <div className="row"><span className="icon-tile lg primary"><GroupIcon icon={d.group.icon} size={24} /></span><div className="stack-1"><AvatarStack names={d.group.members} max={6} /><span className="t-small">{d.group.memberCount} members</span></div></div>
        {err && <Notice tone="danger">{err}</Notice>}
        {d.me?.member ? <Button size="lg" block href={`/groups/${d.group.id}`}>You're already a member · open group</Button>
          : d.me ? (
            <>
              {d.me.email !== d.invite.email && <Notice tone="warning">This invite was sent to {d.invite.email}, but you're signed in as {d.me.email}. You can still join.</Notice>}
              <Button size="lg" block onClick={() => act("accept")} loading={busy === "accept"} disabled={!!busy}>Accept and join</Button>
              <Button variant="ghost" block onClick={() => act("decline")} disabled={!!busy}>Decline</Button>
            </>
          ) : (
            <>
              <p className="t-secondary">Create a free account with <b style={{ color: "var(--navy)" }}>{d.invite.email}</b> or log in to join.</p>
              <Button size="lg" block href="/signup">Sign up to join</Button>
              <Button variant="secondary" block href="/login">I already have an account</Button>
            </>
          )}
      </div>
    </AuthLayout>
  );
}
