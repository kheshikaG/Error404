"use client";
// Searchable member lists - built for groups of ANY size (no fixed grids).
import { useMemo, useState } from "react";
import { Avatar, Checkbox, Radio, SearchInput, Button } from "./core.js";

const SEARCH_FROM = 6;

function useFiltered(members, q) {
  return useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? members.filter((m) => m.name.toLowerCase().includes(s) || (m.email || "").toLowerCase().includes(s)) : members;
  }, [members, q]);
}

// Multi-select with optional per-row controls (e.g. exact amount inputs) and a trailing value.
export function MemberPicker({ members, selected, onChange, meId, renderControl, renderValue, label = "People" }) {
  const [q, setQ] = useState("");
  const list = useFiltered(members, q);
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="picker" role="group" aria-label={label}>
      <div className="picker-tools">
        {members.length > SEARCH_FROM ? <SearchInput value={q} onChange={setQ} placeholder={`Search ${members.length} members`} /> : <span className="t-small grow" style={{ paddingLeft: 4 }}>{selected.length} of {members.length} selected</span>}
        <Button variant="ghost" size="sm" type="button" onClick={() => onChange([...new Set([...selected, ...list.map((m) => m.id)])])}>All</Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => onChange(selected.filter((id) => !list.some((m) => m.id === id)))}>None</Button>
      </div>
      <div className="picker-list">
        {list.map((m) => {
          const on = selected.includes(m.id);
          return (
            <div key={m.id} className="picker-row" role="checkbox" aria-checked={on} tabIndex={0} aria-label={m.name}
              onClick={() => toggle(m.id)} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(m.id))}>
              <Checkbox on={on} />
              <Avatar name={m.name} size="sm" me={m.id === meId} />
              <span className="grow ellipsis" style={{ fontWeight: 500 }}>{m.id === meId ? `You` : m.name}</span>
              {on && renderControl && <span onClick={(e) => e.stopPropagation()}>{renderControl(m)}</span>}
              {renderValue && <span style={{ minWidth: 92, textAlign: "right" }}>{on ? renderValue(m) : <span className="t-small">Not included</span>}</span>}
            </div>
          );
        })}
        {!list.length && <p className="t-small center" style={{ padding: 16 }}>No one matches "{q}"</p>}
      </div>
    </div>
  );
}

// Single choice (e.g. who paid, who to pay).
export function MemberSelect({ members, value, onChange, meId, label = "Choose a person", describe }) {
  const [q, setQ] = useState("");
  const list = useFiltered(members, q);
  return (
    <div className="picker" role="radiogroup" aria-label={label}>
      {members.length > SEARCH_FROM && <div className="picker-tools"><SearchInput value={q} onChange={setQ} placeholder={`Search ${members.length} members`} /></div>}
      <div className="picker-list" style={{ maxHeight: 240 }}>
        {list.map((m) => (
          <div key={m.id} className="picker-row" role="radio" aria-checked={value === m.id} tabIndex={0} aria-label={m.name}
            onClick={() => onChange(m.id)} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), onChange(m.id))}>
            <Radio on={value === m.id} />
            <Avatar name={m.name} size="sm" me={m.id === meId} />
            <span className="grow ellipsis" style={{ fontWeight: 500 }}>{m.id === meId ? `You (${m.name})` : m.name}</span>
            {describe && <span className="t-small">{describe(m)}</span>}
          </div>
        ))}
        {!list.length && <p className="t-small center" style={{ padding: 16 }}>No one matches "{q}"</p>}
      </div>
    </div>
  );
}

// Read-only searchable list (members tab, approvals).
export function MemberList({ members, meId, renderMeta, empty = "No members" }) {
  const [q, setQ] = useState("");
  const list = useFiltered(members, q);
  return (
    <div className="stack">
      {members.length > SEARCH_FROM && <SearchInput value={q} onChange={setQ} placeholder={`Search ${members.length} members`} />}
      <div className="list">
        {list.map((m) => (
          <div className="list-row" key={m.id}>
            <Avatar name={m.name} me={m.id === meId} />
            <div className="grow stack-1" style={{ gap: 0 }}>
              <span className="t-strong ellipsis">{m.name}{m.id === meId ? " (you)" : ""}</span>
              {m.email && <span className="t-small ellipsis">{m.email}</span>}
            </div>
            {renderMeta?.(m)}
          </div>
        ))}
        {!list.length && <p className="t-small center" style={{ padding: 16 }}>{q ? `No one matches "${q}"` : empty}</p>}
      </div>
    </div>
  );
}
