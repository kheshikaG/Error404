# SplitSmart AI design system

Every screen is built from the same tokens and components. **Don't add new colours, fonts, radii or one-off component styles.** Extend the system instead.

- **Live reference:** http://localhost:3000/design-system
- **Tokens and styles:** `app/globals.css`
- **Components:** `components/ds/`, imported with `import { Button, Card, StatusBadge, … } from "@/components/ds"`
- **Shared blocks** (group card, expense item, payment item, activity item): `components/blocks.js`
- **Status vocabulary:** `lib/status.js`

## Tokens

### Colours

| Colour | Hex | Used for |
|---|---|---|
| Primary | `#2563EB` | Actions, active nav, links, selection |
| Navy | `#0F172A` | Headings, key money figures |
| Soft blue | `#EFF6FF` | Information and AI areas |
| Success | `#16A34A` | Confirmed and positive states |
| Warning | `#F59E0B` | Pending or needs-review states |
| Error | `#DC2626` | Errors, disputes and destructive actions only |
| Background | `#F8FAFC` | Page background |
| Card | `#FFFFFF` | Cards |
| Border | `#E2E8F0` | Borders |
| Secondary text | `#64748B` | Secondary text |

Green and amber are too light for small text on white. For badge text, use their accessible tints: `--success-text` and `--warning-text`.

### Typography, spacing, radius and icons

- **Font:** Inter, bundled locally so it works offline. Page headings are 28px, sections 20px, card titles 16px, body text 15px and secondary text 13–14px. Money is shown at 24–32px in tabular figures.
- **Spacing:** 4, 8, 12, 16, 24, 32 and 48px.
- **Radius:** 10px for controls, 14px for cards and 16px for modals.
- **Icons:** Lucide only. Don't use emoji or any other icon set.

## Rules

1. **Colour means something.** Blue is for actions, green for confirmed, amber for pending or review, and red for errors or destructive actions only. Every status also has an icon and a label, so colour is never the only signal.
2. **Use the `StatusBadge` states:**
   - Processing
   - Needs review
   - Pending approval
   - Confirmed
   - Awaiting payment
   - Awaiting confirmation
   - Payment confirmed
   - Settled
   - Disputed
   - Not received
3. **Keep AI, calculation and confirmation separate.** Use `AiPanel` for what the AI detected, `CalcPanel` for the exact maths, and `ConfirmPanel` or the primary button for what the user confirms. AI output is always presented as "AI detected" or "AI suggestion" with a confidence level.
4. **Use progressive disclosure.** Details such as "How was this calculated?", approvals and receipt items sit behind a `Disclosure` or an expandable row.
5. **Design for any group size.** Use `MemberPicker`, `MemberSelect` or `MemberList`, which are searchable and scrollable. Never use fixed grids of people.
6. **Keep navigation fixed.** The main sections are Dashboard, Groups, Activity, Settlements and Settings, with a prominent Add expense button in the sidebar and in the centre of the mobile tab bar.
7. **Show amounts with a currency every time,** using `fmt()` or `<Amount>`.
8. **Follow the brand's tone of voice.** Copy should be clear, reassuring, concise and human. For example, "We couldn't verify this payment." rather than "VALIDATION FAILED".
