"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout.js";
import { Button, Field, Input, Notice } from "@/components/ds";
import { api } from "@/lib/client.js";

export default function Signup() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "+230 ", password: "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const strong = f.password.length >= 8 && /\d/.test(f.password) && /[a-z]/i.test(f.password);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { const d = await api("/api/auth/signup", { method: "POST", body: f }); router.push(d.next); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Next, we'll verify your email and phone." step={0}>
      <form className="stack-4" onSubmit={submit} noValidate>
        {err && <Notice tone="danger">{err}</Notice>}
        <Field label="Full name">{(id) => <Input id={id} value={f.name} onChange={set("name")} autoComplete="name" placeholder="Aarav Sharma" required />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" value={f.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" required />}</Field>
        <Field label="Mobile number" hint="We'll text a code to verify it.">{(id) => <Input id={id} type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" required />}</Field>
        <Field label="Password" hint={f.password && strong ? "Strong enough" : "At least 8 characters, with a letter and a number"}>
          {(id) => (
            <div className="row-2">
              <Input id={id} type={show ? "text" : "password"} value={f.password} onChange={set("password")} autoComplete="new-password" required />
              <Button type="button" variant="secondary" icon={show ? EyeOff : Eye} onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} />
            </div>
          )}
        </Field>
        <Button type="submit" size="lg" block loading={busy}>Create account</Button>
        <p className="center t-small">Already have an account? <Link href="/login">Log in</Link></p>
      </form>
    </AuthLayout>
  );
}
