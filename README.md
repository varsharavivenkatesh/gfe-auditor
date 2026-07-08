# GFE Bill Auditor

A browser-based tool that audits medical bills against Good Faith Estimates under the federal **No Surprises Act** (45 CFR §149.610–620). Determines whether a patient qualifies for the Patient-Provider Dispute Resolution (PPDR) process and generates a ready-to-file dispute packet PDF — entirely client-side, with no data ever leaving the browser.

<img width="579" height="502" alt="image" src="https://github.com/user-attachments/assets/55654625-5c30-4a00-928e-5f6bc8111997" />


---

## The problem

Since January 2022, uninsured and self-pay patients are legally entitled to a **Good Faith Estimate (GFE)** before any scheduled procedure. If their final bill exceeds the GFE by **$400 or more per provider**, they have the right to formally dispute it through the federal PPDR process.

Almost nobody knows this right exists — and even fewer know how to use it. The process involves reading federal regulations, correctly comparing estimates against bills on a per-provider basis (not a combined total, which is the most common mistake), and submitting a formal initiation notice to a CMS-contracted reviewer within 120 calendar days of receiving the bill.

This tool automates that entire workflow.

---

## Demo

> **Try it:** Clone the repo, run `npm install && npm run dev`

**Flow:**
1. Eligibility gate — progressive checklist confirms you meet all CMS criteria before asking for any data
2. GFE entry — enter estimated charges grouped by provider (surgeon, facility, anesthesiologist separately)
3. Bill entry — enter actual billed amounts; live per-provider diff updates as you type
4. Results — eligibility verdict, per-provider breakdown with legal citations, filing deadline countdown
5. PDF download — 4-page dispute packet generated in-browser, ready to submit to the federal portal

<img width="476" height="579" alt="Screenshot 2026-07-07 201524" src="https://github.com/user-attachments/assets/59bb2278-f23e-4240-b1d8-847f014bfacb" />
<img width="473" height="557" alt="Screenshot 2026-07-07 201744" src="https://github.com/user-attachments/assets/070d1f62-b769-4d26-ae21-648016606434" />
<img width="477" height="596" alt="Screenshot 2026-07-07 201759" src="https://github.com/user-attachments/assets/63a9930d-fb55-419c-8e46-b27c6ded59be" />
<img width="473" height="551" alt="Screenshot 2026-07-07 201813" src="https://github.com/user-attachments/assets/2953157e-aeb8-49d0-b9a0-252632cc16ad" />





---

## Why the per-provider distinction matters

The $400 threshold is evaluated **per provider**, not as a combined total across the whole bill. This is specified in 45 CFR §149.620(a)(3) and confirmed by CMS's own worked examples — but it's the rule that nearly every naive implementation gets wrong.

Example: a surgeon bills $300 over estimate and a facility bills $450 over estimate. The combined overage is $750, but only the facility individually clears $400. A tool that compares totals would flag both as disputed. The correct answer — and what this tool computes — is that only the facility qualifies.

This edge case is covered explicitly in the test suite.

---

### Rule engine (`eligibility.ts`)

The core logic is a set of pure TypeScript functions that implement the PPDR eligibility rules directly from the regulation text:

| Function | What it implements |
|---|---|
| `compareByProvider()` | Groups line items by provider, computes per-provider overage — the legally correct unit of comparison per 45 CFR §149.620(a)(3) |
| `evaluateEligibility()` | Full eligibility determination: billing status gate, $400 per-provider threshold, 120-day filing window |
| `getFilingDeadline()` | Bill received date + 120 calendar days, UTC-safe to avoid timezone drift |
| `isWithinFilingWindow()` | Inclusive boundary: day 120 counts, day 121 does not |

Every function is dependency-free and injectable (accepts `today` as a parameter) so the test suite can pin dates without mocking.

### PDF generation (`generatePacket.ts`)

Generates a 4-page dispute packet using [pdf-lib](https://pdf-lib.js.org/), running entirely in the browser:

| Page | Contents |
|---|---|
| 1 | Cover page, eligibility verdict, per-provider overage summary table, filing deadline |
| 2 | Full legal comparison with 45 CFR citations per provider |
| 3 | Pre-filled PPDR Initiation Notice matching CMS form fields — patient info, disputed providers, bill date, filing fee acknowledgment, signature block |
| 4 | Submission checklist, online vs. mail instructions, patient protections during dispute |

### UI

- **React + TypeScript + Vite** — no backend, no database
- **Privacy by design** — all data stays in the browser; nothing is transmitted to any server
- **Accessibility** — skip link, correct heading hierarchy (`h1`/`h2`), `role="group"` + `aria-labelledby` on checklist questions, `aria-pressed` on toggle buttons, `role="alert"` on deadline countdowns, 44px minimum touch targets throughout
- **Reduced motion** — all transitions respect `prefers-reduced-motion`

---

## Test coverage

```
21 tests | 100% line coverage | 96% branch coverage
```

Key edge cases covered explicitly:

- **$400 boundary** — exactly $400 qualifies, $399.99 does not
- **Naive total trap** — one provider under estimate, one over: only the over-threshold provider is flagged, not both
- **Undisclosed provider** — a provider appearing on the bill but not the GFE is treated as a $0 estimate (full billed amount is the overage)
- **120-day boundary** — day 120 is within window, day 121 is not
- **Leap year date math** — UTC-based parsing prevents off-by-one errors across Feb 29
- **Multiple simultaneous ineligibility reasons** — all reasons accumulated and returned, not short-circuited

```bash
npm test               # run test suite
npm run test:coverage  # coverage report
npm run typecheck      # zero TypeScript errors
```

---

## Legal basis

All rules are sourced directly from federal regulations and CMS consumer guidance:

| Rule | Source |
|---|---|
| GFE required for uninsured/self-pay patients | 45 CFR §149.610 |
| $400 per-provider threshold for PPDR eligibility | 45 CFR §149.620(a)(3) |
| 120-calendar-day filing window from bill receipt | 45 CFR §149.620(b)(1) |
| $25 non-refundable patient filing fee | CMS PPDR Consumer Page (confirmed current as of July 2026) |
| Provider protections during active dispute | CMS No Surprises Act Consumer Guidance |

> **Disclaimer:** This tool is not legal advice. It implements publicly available federal rules to help patients understand their rights. For complex situations, contact the CMS No Surprises Help Desk at 1-800-985-3059.

---

## Stack

| | |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **PDF generation** | pdf-lib (browser-native, no server) |
| **Testing** | Vitest, @vitest/coverage-v8 |
| **Styling** | CSS custom properties, 4/8pt spacing system |
| **No backend** | Intentional — medical billing data never leaves the user's device |

---

## Getting started

```bash
git clone https://github.com/varsharavivenkatesh/gfe-auditor
cd gfe-auditor
npm install
npm run dev        # http://localhost:5173
npm test           # run test suite
npm run build      # production build
```

Requires Node 18+.
