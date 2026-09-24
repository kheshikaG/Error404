"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { LayoutDashboard, Users, Activity, ArrowLeftRight, Settings, Plus, LogOut, Info } from "lucide-react";
import { Avatar, Button, Spinner, LogoMark, useToast } from "@/components/ds";
import { api } from "@/lib/client.js";
import { fmt } from "@/lib/money.js";
import AddExpenseFlow from "@/components/flows/AddExpenseFlow.js";
import SettleFlow from "@/components/flows/SettleFlow.js";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const NAV = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/groups", "Groups", Users],
  ["/activity", "Activity", Activity],
  ["/settlements", "Settlements", ArrowLeftRight],
  ["/settings", "Settings", Settings],
];

export function Logo({ href = "/" }) {
  return (
    <Link href={href} className="logo" aria-label="SplitSmart AI home">
      <LogoMark size={28} />
      <span>SplitSmart <span className="ai">AI</span></span>
    </Link>
  );
}

export function DemoBar() {
  return (
    <div className="demo-bar" role="note">
      <Info size={14} aria-hidden />
      <span>Demo mode: emails and SMS go to the <Link href="/mailbox">demo mailbox</Link>, and wallet balances are simulated.</span>
    </div>
  );
}

export function PublicShell({ children }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <DemoBar />
      <div className="public-top">
        <Logo />
        <div className="row-2">
          <Button variant="ghost" href="/login">Log in</Button>
          <Button href="/signup">Sign up</Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function isActive(path, href) {
  if (href === "/settlements") return path.startsWith("/settlements") || path.startsWith("/wallet");
  if (href === "/groups") return path.startsWith("/groups") || path.startsWith("/join");
  return path === href || path.startsWith(href + "/");
}

export default function Shell({ children, bare }) {
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [tick, setTick] = useState(0);
  const [flow, setFlow] = useState(null); // { kind: "expense" | "settle", ...opts }
  const seen = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const d = await api("/api/me");
      setMe(d);
      if (!d.user.onboarded && path !== "/onboarding") router.replace("/onboarding");
      return d;
    } catch (e) {
      if (e.status === 401) {
        try { sessionStorage.setItem("ss_next", window.location.pathname + window.location.search); } catch {}
        router.replace("/login");
      }
    }
  }, [path, router]);

  useEffect(() => { refresh(); }, [refresh]);

  // Live updates: poll notifications so every open screen reflects other members' actions.
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const d = await api("/api/notifications");
        const ids = new Set(d.notifications.map((n) => n.id));
        if (seen.current) {
          const fresh = d.notifications.filter((n) => !seen.current.has(n.id));
          fresh.slice(0, 2).forEach((n) => toast(n.title, "info"));
          if (fresh.length) { setTick((t) => t + 1); refresh(); }
        }
        seen.current = ids;
        setMe((m) => (m ? { ...m, unread: d.unread } : m));
      } catch {}
      if (!stop) setTimeout(poll, 3500);
    };
    poll();
    return () => { stop = true; };
  }, [toast, refresh]);

  const bump = useCallback(() => { setTick((t) => t + 1); refresh(); }, [refresh]);
  const openAddExpense = useCallback((opts = {}) => setFlow({ kind: "expense", ...opts }), []);
  const openSettle = useCallback((opts = {}) => setFlow({ kind: "settle", ...opts }), []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const ctx = { ...me, me: me?.user, refresh, tick, bump, openAddExpense, openSettle };

  if (bare) {
    return <AppCtx.Provider value={ctx}>{me?.user ? children : <div className="auth"><Spinner size={28} /></div>}</AppCtx.Provider>;
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        <aside className="sidebar" aria-label="Sidebar">
          <Logo href="/dashboard" />
          <Button icon={Plus} block size="lg" onClick={() => openAddExpense()}>Add expense</Button>
          <nav className="nav" aria-label="Primary">
            {NAV.map(([href, label, I]) => (
              <Link key={href} href={href} className="nav-item" aria-current={isActive(path, href) ? "page" : undefined}>
                <I size={19} strokeWidth={1.9} aria-hidden />
                {label}
                {href === "/activity" && me?.unread ? <span className="count" aria-label={`${me.unread} unread`}>{me.unread > 9 ? "9+" : me.unread}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="sidebar-foot">
            {me && (
              <Link href="/wallet" className="tile" style={{ color: "inherit", textDecoration: "none" }}>
                <div className="t-label">Wallet balance · demo</div>
                <div className="t-amount" style={{ fontSize: 17 }}>{fmt(me.wallet || 0)}</div>
              </Link>
            )}
            {me?.user && (
              <div className="row-2">
                <Link href="/settings" className="user-chip grow" style={{ minWidth: 0 }}>
                  <Avatar name={me.user.name} me />
                  <span className="stack-1 grow" style={{ gap: 0, minWidth: 0 }}>
                    <span className="t-strong ellipsis" style={{ fontSize: 14 }}>{me.user.name}</span>
                    <span className="t-small ellipsis">{me.user.email}</span>
                  </span>
                </Link>
                <Button variant="ghost" size="sm" icon={LogOut} onClick={logout} aria-label="Log out" title="Log out" />
              </div>
            )}
          </div>
        </aside>

        <div className="main">
          <DemoBar />
          <header className="topbar">
            <Logo href="/dashboard" />
            {me?.user && <Link href="/settings" aria-label="Settings"><Avatar name={me.user.name} size="sm" me /></Link>}
          </header>
          {me?.user ? children : <div className="page center" style={{ paddingTop: 96 }}><Spinner size={28} /></div>}
        </div>

        <nav className="bottom-nav" aria-label="Primary (mobile)">
          {[NAV[0], NAV[1]].map(([href, label, I]) => (
            <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}><I size={21} aria-hidden />{label}</Link>
          ))}
          <button onClick={() => openAddExpense()} aria-label="Add expense"><span className="fab"><Plus size={24} aria-hidden /></span>Add</button>
          {[NAV[2], NAV[3]].map(([href, label, I]) => (
            <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}>
              <I size={21} aria-hidden />{label}
              {href === "/activity" && me?.unread ? <span className="count" style={{ position: "absolute", top: 0, right: "22%" }}>{me.unread > 9 ? "9+" : me.unread}</span> : null}
            </Link>
          ))}
        </nav>
      </div>

      {me?.user && flow?.kind === "expense" && (
        <AddExpenseFlow
          groupId={flow.groupId}
          meId={me.user.id}
          aiMode={me.aiMode}
          onClose={() => setFlow(null)}
          onDone={bump}
          onPaymentProof={(groupId) => setFlow({ kind: "settle", groupId, method: "bank" })}
        />
      )}
      {me?.user && flow?.kind === "settle" && (
        <SettleFlow
          groupId={flow.groupId}
          to={flow.to}
          amount={flow.amount}
          method={flow.method}
          meId={me.user.id}
          walletBalance={me.wallet || 0}
          onClose={() => setFlow(null)}
          onDone={bump}
        />
      )}
    </AppCtx.Provider>
  );
}
