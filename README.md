# Error404
webapp for challenge 7
# SplitSmart AI — Prototype

A polished, working prototype for Finnovate Hackathon 2026 (Challenge 7: Making Shared
Expenses Simple and Fair).

> Other apps calculate what you tell them. SplitSmart AI verifies what actually happened.

This is a **UI/UX-focused prototype**: it runs entirely on realistic mock data, with no
real backend, auth, or AI API wired in yet — by design, so the full flow can be demoed and
iterated on quickly. Every number you see (balances, settlement plan, per-item splits) is
computed **live** by a real, deterministic calculation engine (`src/lib/calc.js`) from that
mock data — nothing is a hardcoded string. Swapping in Supabase (Postgres + Auth + Realtime)
and the Claude API (real receipt OCR) later is a contained change: everything data-related
goes through `src/lib/mock-service.js`, and nothing in a page or component talks to storage
or AI directly.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects straight to `/groups`. No login, no API keys, no
network access required to demo the full flow.

## What's built (Tier 1)

1. **`/groups`** — dashboard: 3 sample groups, member avatars, total spend, a live
   "you owe / you're owed" balance widget per group.
2. **`/groups/new`** — create a group: name, template, approval rule (all-approve vs.
   majority), then an invite screen with a generated link + QR code.
3. **`/groups/:id`** — group home: balance, members, "+ Add expense," recent expenses,
   activity preview.
4. **`/groups/:id/expense/new`** — the 4-tile entry point: Scan receipt / Type it out /
   Upload payment proof / Manual entry.
5. **`/groups/:id/expense/new/receipt`** — the AI-review screen: mock receipt data shown as
   an editable item list, tap-to-toggle avatars per item (`AvatarPicker`), a live
   "Allocated vs. Remaining" total, and a real reconciliation-mismatch warning banner
   (alternates between a clean and a mismatched mock scan on each upload, so both states are
   demoable without needing a real bad photo).
6. **Balance calculation** — proportional tax/tip allocation (`user_final_share =
   user_subtotal × (1 + (tax+tip)/subtotal)`), net balances, and settlement optimization,
   exactly as specified, all in `src/lib/calc.js` with a standalone test file
   (`node src/lib/calc.test.mjs`).
7. **`/groups/:id/settle`** — the optimized minimum-transaction settlement plan (not a messy
   pairwise list), with a cash-vs-bank-proof confirmation modal and a "Settled ✅" moment.

**Not yet built (Tier 2, on the roadmap)**: "Explain this amount" breakdowns, the
chat-style natural-language expense entry screen, cash-settlement recipient-confirmation
flow, the approval-meter on manual entries, and evidence-tier badges surfaced everywhere.
**Tier 3** (voice input, currency conversion, disputes, partial payments) is intentionally
not built yet — later roadmap only.

## Design system

One accent color, one type scale, one spacing rhythm, applied identically across every
screen (`src/app/globals.css`). Status is always icon + text, never color alone
(`StatusBadge` in `src/components/ui.jsx`): Confirmed / Pending approval / Pending
confirmation / Disputed / Settled. Mobile-first layout (max-width column, works at phone
width). Skeleton/shimmer loading states instead of blank spinners. Empty states always carry
one clear next action.

## Key reusable components (`src/components/split-components.jsx`)

- `AvatarPicker` — tap-to-toggle group members per line item
- `ExpenseCard` — visually distinct states for Confirmed / Pending / Disputed
- `ApprovalMeter` — "2 of 3 approved" progress bar
- `BalanceSummary` — the "you owe / you're owed" widget
- `SplitEditor` — the core review UI for adjusting AI-proposed splits, with the
  reconciliation-warning banner
- `SettlementConfirmModal` — bank-proof vs. cash-confirmation branch, ending in a
  "Settled ✅" pop animation

## Project structure

```
src/
  app/
    page.jsx                     Redirects to /groups
    groups/page.jsx               Dashboard
    groups/new/page.jsx           Create group + invite
    groups/[groupId]/page.jsx     Group home
    groups/[groupId]/expense/new/page.jsx           4-tile entry point
    groups/[groupId]/expense/new/receipt/page.jsx   AI-review / SplitEditor screen
    groups/[groupId]/settle/page.jsx                Settlement plan
  components/
    AppShell.jsx                  Nav shell (no auth — fixed demo user)
    ui.jsx                        Card, Button, StatusBadge, Avatar, Skeleton, EmptyState
    split-components.jsx          The reusable components listed above
  lib/
    calc.js                       Deterministic balance math — has unit tests
    calc.test.mjs                 Run: node src/lib/calc.test.mjs
    money.js                      Integer minor-unit money handling, formatting
    mock-data.js                  3 groups, 2-4 members each, 6 realistic expenses
    mock-service.js               The ONLY place pages should get data from —
                                   swap point for Supabase later
```

## Next steps to reach 100% of the brief

- Build Tier 2: "Explain this amount," natural-language entry, cash-confirmation flow,
  approval meters, evidence badges everywhere.
- Wire Supabase in behind `mock-service.js` (same function signatures).
- Wire the Claude API (vision) for real receipt OCR behind the same entry point.
- Add voice input, real-time currency conversion, disputes, and partial payments
  (Tier 3 — currently roadmap only, per the brief).
