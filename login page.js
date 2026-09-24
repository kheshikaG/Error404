"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout.js";
import { Button, Field, Input, Notice } from "@/components/ds";
import { api } from "@/lib/client.js";

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { const d = await api("/api/auth/login", { method: "POST", body: f }); router.push(d.next); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in, then confirm it's you with a one-time code.">
      <form className="stack-4" onSubmit={submit}>
        {err && <Notice tone="danger">{err}</Notice>}
        <Field label="Email">{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" required />}</Field>
        <Field label="Password">{(id) => <Input id={id} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" required />}</Field>
        <Button type="submit" size="lg" block loading={busy}>Continue</Button>
        <p className="center t-small">New to SplitSmart AI? <Link href="/signup">Create an account</Link></p>
        <Notice tone="info" title="Demo accounts">aarav@demo.mu, priya@demo.mu, zoe@demo.mu, sam@demo.mu or ravi@demo.mu. The password is <b>demo1234</b>.</Notice>
      </form>
    </AuthLayout>
  );
}
