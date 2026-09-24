"use client";
// SplitSmart AI component library - core building blocks.
// Every screen is composed from these. Styles live in app/globals.css (design tokens).
import Link from "next/link";
import { useId } from "react";
import { LoaderCircle, Search, ChevronRight, ArrowLeft, Info, CircleCheck, TriangleAlert, CircleX } from "lucide-react";
import { STATUS } from "@/lib/status.js";
import { STATUS_ICON } from "./icons.js";
import { fmt } from "@/lib/money.js";

const cx = (...a) => a.filter(Boolean).join(" ");

// ---------------- Buttons ----------------
export function Button({ variant = "primary", size, block, icon: Icon, iconRight: IconRight, loading, href, className, children, ...props }) {
  const cls = cx("btn", `btn-${variant}`, size && `btn-${size}`, block && "btn-block", !children && "btn-icon", className);
  const inner = (
    <>
      {loading ? <LoaderCircle size={18} className="spin" aria-hidden /> : Icon ? <Icon size={size === "sm" ? 16 : 18} strokeWidth={2} aria-hidden /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={16} strokeWidth={2} aria-hidden /> : null}
    </>
  );
  if (href) return <Link href={href} className={cls} {...props}>{inner}</Link>;
  return (
    <button className={cls} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {inner}
    </button>
  );
}

// ---------------- Layout ----------------
export function Card({ pad = true, className, children, as: As = "div", ...props }) {
  return <As className={cx("card", pad === true && "card-pad", pad === "sm" && "card-pad-sm", className)} {...props}>{children}</As>;
}

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="card-head">
      <div className="row grow">
        {Icon && <Icon size={18} strokeWidth={1.8} aria-hidden style={{ color: "var(--text-2)" }} />}
        <div className="grow">
          <h2 className="t-card">{title}</h2>
          {subtitle && <p className="t-small">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <header className="page-header">
      <div className="stack-2 grow">
        {back && <Link href={back.href} className="row-2 t-small" style={{ color: "var(--text-2)" }}><ArrowLeft size={16} aria-hidden /> {back.label}</Link>}
        <h1 className="t-page">{title}</h1>
        {subtitle && <p className="t-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="row row-wrap">{actions}</div>}
    </header>
  );
}

// ---------------- Forms ----------------
export function Field({ label, hint, error, children, id }) {
  const auto = useId();
  const fid = id || auto;
  const child = typeof children === "function" ? children(fid) : children;
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={fid}>{label}</label>}
      {child}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
export const Input = ({ className, size, ...p }) => <input className={cx("input", size === "sm" && "input-sm", className)} {...p} />;
export const Select = ({ className, children, ...p }) => <select className={cx("select", className)} {...p}>{children}</select>;
export const Textarea = ({ className, ...p }) => <textarea className={cx("textarea", className)} {...p} />;

export function MoneyInput({ currencySymbol = "Rs", large, small, width, style, ...p }) {
  return (
    <div className="input-affix" style={{ width, flexShrink: width ? 0 : undefined }}>
      <span className="affix" style={large ? { fontSize: 16, fontWeight: 600 } : small ? { fontSize: 13, left: 10 } : undefined}>{currencySymbol}</span>
      <input className={cx("input", large && "input-amount", small && "input-sm")} inputMode="decimal" autoComplete="off" {...p}
        style={{ paddingLeft: small ? (currencySymbol.length > 2 ? 40 : 32) : currencySymbol.length > 2 ? 48 : 38, ...(style || {}) }} />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search", label = "Search", ...p }) {
  return (
    <div className="search">
      <Search size={16} aria-hidden />
      <input className="input input-sm" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} {...p} />
    </div>
  );
}

export function Checkbox({ on }) {
  return (
    <span className={cx("check", on && "on")} aria-hidden>
      {on && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </span>
  );
}
export const Radio = ({ on }) => <span className={cx("radio", on && "on")} aria-hidden />;

export function Segmented({ options, value, onChange, block, label }) {
  return (
    <div className={cx("segmented", block && "block")} role="group" aria-label={label}>
      {options.map(([v, l, Icon]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {Icon && <Icon size={15} aria-hidden />}{l}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map(([v, l, count]) => (
        <button key={v} role="tab" type="button" aria-selected={value === v} onClick={() => onChange(v)}>
          {l}{count ? <span className="count" style={{ background: value === v ? "var(--primary)" : "var(--text-3)" }}>{count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export const Chip = ({ active, children, ...p }) => <button type="button" className="chip" aria-pressed={!!active} {...p}>{children}</button>;

// ---------------- Status & money ----------------
export function Badge({ tone = "neutral", icon: Icon, children, title }) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {Icon && <Icon size={13} strokeWidth={2.2} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, label, detail }) {
  const s = STATUS[status] || STATUS.processing;
  const I = STATUS_ICON[s.icon];
  return (
    <span className={`badge badge-${s.tone}`} title={s.help}>
      <I size={13} strokeWidth={2.2} aria-hidden className={status === "processing" ? "spin" : undefined} />
      {label || s.label}{detail ? <span style={{ fontWeight: 500 }}>· {detail}</span> : null}
    </span>
  );
}

// Amount + currency, always. tone "positive" = money coming to you (green); default navy.
export function Amount({ cents, currency = "MUR", size, tone, sign, className }) {
  const cls = cx(size === "xl" ? "t-amount-xl" : size === "lg" ? "t-amount-lg" : "t-amount", tone === "positive" && "t-positive", className);
  return <span className={cls}>{sign && cents > 0 ? "+" : ""}{fmt(cents, currency)}</span>;
}

export function Kpi({ label, children, sub, icon: Icon, tone }) {
  return (
    <div className="kpi">
      <span className="row-2 t-label">{Icon && <span className={cx("icon-tile sm", tone)}><Icon size={16} aria-hidden /></span>}{label}</span>
      <div>{children}</div>
      {sub && <span className="t-small">{sub}</span>}
    </div>
  );
}

// ---------------- People ----------------
const initials = (name = "?") => {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};
export function Avatar({ name, size, me }) {
  return (
    <span className={cx("avatar", size && `avatar-${size}`)} title={name} aria-hidden
      style={me ? { background: "var(--primary)", color: "#fff" } : { background: "var(--soft-blue)", color: "var(--primary-hover)" }}>
      {initials(name)}
    </span>
  );
}
export function AvatarStack({ names, max = 5, size = "sm" }) {
  const extra = names.length - max;
  return (
    <span className="avatar-stack" aria-label={`${names.length} people`}>
      {names.slice(0, max).map((n, i) => <span key={i} style={{ zIndex: max - i, borderRadius: "50%", display: "inline-flex" }}><Avatar name={n} size={size} /></span>)}
      {extra > 0 && <span className={cx("avatar", `avatar-${size}`)} style={{ background: "var(--neutral-soft)", color: "var(--text-2)" }}>+{extra}</span>}
    </span>
  );
}

// ---------------- Feedback ----------------
export const Spinner = ({ size = 18 }) => <LoaderCircle size={size} className="spin" aria-label="Loading" style={{ color: "var(--primary)" }} />;
export const Skeleton = ({ h = 16, w = "100%", style }) => <div className="skeleton" style={{ height: h, width: w, ...style }} />;

const NOTICE_ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleX };
export function Notice({ tone = "info", title, children, icon, action }) {
  const I = icon || NOTICE_ICON[tone];
  return (
    <div className={`notice notice-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <I size={18} aria-hidden />
      <div className="grow stack-1">
        {title && <span className="notice-title">{title}</span>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && <span className="icon-tile lg primary"><Icon size={24} aria-hidden /></span>}
      <h3 className="t-card">{title}</h3>
      {text && <p className="t-secondary" style={{ maxWidth: 380 }}>{text}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function Progress({ value, max = 100, tone, label }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cx("progress", tone)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div style={{ width: pct + "%" }} />
    </div>
  );
}

export function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label="Progress" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {steps.map((s, i) => (
        <li key={s} className="row-2" style={{ flex: i < steps.length - 1 ? 1 : "none", gap: 8 }}>
          <span className={cx("st", i < current && "done", i === current && "now")} aria-current={i === current ? "step" : undefined}>
            <span className="n">{i < current ? "✓" : i + 1}</span><span className="lbl">{s}</span>
          </span>
          {i < steps.length - 1 && <span className="bar" />}
        </li>
      ))}
    </ol>
  );
}

export function Disclosure({ summary, children, open }) {
  return (
    <details className="disclosure" open={open}>
      <summary><ChevronRight size={16} aria-hidden />{summary}</summary>
      <div>{children}</div>
    </details>
  );
}

export function ListRow({ leading, title, subtitle, trailing, onClick, href }) {
  const body = (
    <>
      {leading}
      <div className="grow stack-1" style={{ gap: 2 }}>
        <div className="t-strong ellipsis" style={{ fontSize: 14.5 }}>{title}</div>
        {subtitle && <div className="t-small ellipsis">{subtitle}</div>}
      </div>
      {trailing}
      {(onClick || href) && <ChevronRight size={16} aria-hidden style={{ color: "var(--text-3)" }} />}
    </>
  );
  if (href) return <Link href={href} className="list-row clickable" style={{ color: "inherit", textDecoration: "none" }}>{body}</Link>;
  if (onClick) return <div className="list-row clickable" role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === "Enter" && onClick()}>{body}</div>;
  return <div className="list-row">{body}</div>;
}
