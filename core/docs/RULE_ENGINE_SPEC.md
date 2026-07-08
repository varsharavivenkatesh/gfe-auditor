# GFE Bill Auditor — Rule Engine Requirements

This document is the legal/logic spec for the rules engine. Every rule below is
written in plain English first, then as pseudocode, with its source cited.
This file is the backbone of the README and Devpost write-up — it's the proof
that the tool's logic is grounded in the actual regulation, not guesswork.

**Legal basis:** No Surprises Act (Title I of Division BB, Consolidated
Appropriations Act, 2021), implementing regulations at 45 CFR §149.610
(Good Faith Estimates) and §149.620 (Patient-Provider Dispute Resolution).

---

## 1. Who is eligible for a GFE at all

**Plain English:** The GFE/PPDR system only applies to patients who are
**uninsured**, or who are insured but choose **not to bill their insurance**
(self-pay) for the specific item or service. Patients using their insurance
normally are covered by a different part of the No Surprises Act (the
balance-billing / Qualifying Payment Amount rules), not this dispute process.

**Source:** "If a consumer doesn't have health insurance, or doesn't plan to
use that insurance to pay for health care items or services, they must be
given a good faith estimate" — CMS, Providers: payment resolution with patients.

**Rule:**
```
patient.billingStatus ∈ { "uninsured", "self-pay" }   // required, else N/A
```

If the patient is insured and billed through insurance, the tool should say
clearly: "This tool covers the GFE/PPDR process for uninsured and self-pay
patients only. Your situation may be covered by different No Surprises Act
protections (balance billing) — not handled by this version of the tool."
This is an explicit, honest scope boundary — state it in the UI, not just in
code comments.

---

## 2. When a GFE is required / timing rules

**Plain English:** Depending on how far in advance the service was scheduled,
the provider has a deadline to deliver the GFE.

| Scheduled how far in advance | GFE must be delivered by |
|---|---|
| ≥ 10 days before service | within 3 business days of scheduling |
| 3–9 days before service | within 1 business day of scheduling |
| < 3 days before service | no GFE required at all |

**Source:** American College of Surgeons summary of 45 CFR 149.610 delivery
timing requirements.

**Rule use case:** This isn't part of the dispute-eligibility calculation
itself, but it's useful for an informational check: if the patient says
"I never got a GFE," the tool can tell them whether they were *entitled* to
one based on scheduling lead time, which is a separate but related right.
v1 scope decision: include this as an informational branch, not a blocker —
a patient might still have grounds to dispute even if GFE timing is murky,
since this tool is about bill-vs-estimate comparison, not GFE delivery
compliance enforcement.

---

## 3. The core eligibility trigger — $400 threshold, per provider

**Plain English:** A patient can dispute a bill if the amount actually billed
by *any single provider or facility* is **$400 or more** above what that
*same provider or facility* estimated in the GFE. This comparison is done
**per provider**, not by totaling the whole GFE against the whole bill. A GFE
can include multiple providers (e.g., surgeon, facility, anesthesiologist);
each one's billed-vs-estimated gap is evaluated independently.

**Source:** "Patients are only eligible for the patient-provider dispute
resolution process if their bill from an individual provider or facility is
at least $400 more than the total expected costs on the good faith estimate
from that provider or facility" — XiFin summary of CMS GFE/PPDR requirements.
Confirmed by CMS's own worked examples, which compare "each individual
provider's GFE...and not the total for all providers" (LegalClarity summary
of CMS guidance).

**This is the single most important and most commonly-gotten-wrong rule.**
A naive implementation compares bill total vs. GFE total. The actual rule
requires line-item grouping by provider/facility first. Building this
correctly — and demonstrating it with a multi-provider test case — is the
strongest "we read the real regulation" signal in the whole project.

**Rule:**
```
function getEligibleOverages(gfe: GoodFaithEstimate, bill: ActualBill): ProviderOverage[] {
  groupedByProvider = groupLineItemsByProvider(gfe, bill)
  results = []
  for provider in groupedByProvider:
    overage = provider.billedTotal - provider.estimatedTotal
    if overage >= 400:
      results.push({ provider, overage })
  return results
}
```

**Edge cases to test explicitly:**
- Exactly $400 (boundary — counts as eligible, "$400 or more")
- $399.99 (just under — not eligible)
- One provider triggers, another on the same bill doesn't (must still flag the triggering one)
- GFE has a provider with no matching bill line item (treat as $0 estimate → full billed amount is overage, if it clears $400)
- Bill has a provider not in the GFE at all (same as above — undisclosed provider)

---

## 4. Filing deadline — 120 calendar days

**Plain English:** Once eligible, the patient has 120 **calendar** days
(not business days) from the date they **received the bill** — not the date
of service, not the date of the GFE — to start the dispute process.

**Source:** "You can use the new dispute resolution process [if] you got the
bill within the last 120 calendar days" — CFPB. Confirmed independently by
LegalClarity: "the patient must submit a notice of initiation...within 120
calendar days of the date on the initial bill."

**Rule:**
```
function getFilingDeadline(billReceivedDate: Date): Date {
  return addCalendarDays(billReceivedDate, 120)
}

function isWithinFilingWindow(billReceivedDate: Date, today: Date): boolean {
  return daysBetween(billReceivedDate, today) <= 120
}
```

**Edge case to test:** exactly day 120 (inclusive — still eligible), day 121
(expired).

**UX implication:** if a patient is eligible by dollar amount but close to or
past the 120-day mark, this should be the most prominent thing on screen —
a missed deadline is the single most costly mistake a real user could make
with this tool, more costly than a wrong dollar calculation.

---

## 5. What protection applies once a dispute is filed

**Plain English:** This isn't part of the eligibility *calculation*, but it's
critical reassurance content for a scared user, and it directly supports the
"plain-language explainer" UX requirement.

**Source:** "During the patient-provider dispute resolution process,
providers may not move the bill into collections or threaten to do so, must
pause collections if it's already there, can't collect late fees on unpaid
amounts, and can't threaten retaliatory action against the patient for
initiating the process" — CMS.

**Use in product:** static informational panel, shown once eligibility is
confirmed. Not computed — just accurately reproduced from the source above,
in the tool's own plain-language phrasing (not copied verbatim).

---

## 6. GFE required fields — for the data model (Day 3-5)

**Plain English:** A real GFE contains specific structured fields. Modeling
these properly (rather than just "estimate total: $X") is what allows
correct per-provider grouping in Rule #3.

**Source:** LegalClarity summary of 45 CFR 149.610 GFE content requirements.

Required fields to model:
- Patient name + date of birth
- Description of primary item/service
- Itemized list of services, **grouped by provider/facility**
- Per-item: diagnosis code, service code (CPT/ICD-10), expected charge
- Per-provider: name, NPI, TIN, location

v1 scope decision: not all fields are needed for the *dispute logic* — only
provider identity + itemized charges matter for the $400 calculation. The
rest (NPI, diagnosis codes) matter for generating an accurate, professional-
looking dispute packet PDF that mirrors a real GFE's structure. Build the
data model to hold all of them now so PDF generation later doesn't require
a schema rework.

---

## 7. Explicit out-of-scope items (state these in the README)

Being upfront about what this tool does *not* do is a credibility strength,
not a weakness, for hackathon judges:

- Does not determine whether a GFE was *required* to be given in the first
  place beyond the basic timing check in §2 (that determination has more
  nuance — e.g. emergency services are excluded entirely).
- Does not handle the **insured, balance-billing** side of the No Surprises
  Act (different mechanism, different thresholds — out of scope for v1).
- Does not submit anything to the federal PPDR portal automatically — it
  generates a ready-to-file packet for the patient to submit themselves.
  (Verify current submission mechanism/portal before describing this in the UI.)
- Does not currently confirm the PPDR filing fee amount — this number must
  be verified directly against the CMS PPDR consumer page before being shown
  to users. Do not state a fee figure until confirmed.

---

## Resolved (previously open) items — confirmed via CMS sources, June 2026

1. **PPDR filing fee: $25, non-refundable**, paid by the patient to initiate
   a dispute (CMS, "Dispute a medical bill"). If the patient wins, the $25
   is deducted from what they owe the provider. Payable online (credit card,
   PayPal, Venmo) or by mail (money order/cashier's check only).
   **Do not confuse this with the $15 administrative fee** introduced by the
   May 2026 CMS final rule — that fee applies to the *separate* Federal IDR
   process between providers and health plans, not patient-initiated PPDR.
   This distinction is worth a one-line footnote in the UI/README to show
   the research was current and careful.

2. **Filing mechanism**: HHS recommends initiating through the federal
   online dispute portal; a mail-in fallback exists via the contracted
   reviewer (C2C Innovative Solutions Inc., per the official PPDR
   initiation form). The tool should generate a packet matching the fields
   on CMS's actual "Patient-Provider Dispute Resolution Initiation Form,"
   not a synthetic format — this is the form patients/judges may recognize.

3. **Full eligibility checklist, confirmed directly from CMS's consumer
   page** — restated here as the canonical v1 checklist for the tool's
   eligibility screen:
   - Didn't have or didn't use insurance to pay for the care
   - Told the provider in advance they weren't using insurance
   - Got care on or after January 1, 2022
   - Received a GFE at least 3 days before the scheduled appointment
   - Initial bill is dated within the last 120 calendar days
   - At least one provider/facility charged $400+ more than its GFE amount

   This checklist is a good candidate for the literal first screen of the
   app — a fast, low-friction "do you even qualify" gate before asking the
   user to enter itemized data.

4. **$400 threshold and 120-day window remain current as of June 2026.**
   No CMS guidance found indicating these patient-facing PPDR figures have
   changed; the only recent fee change (CMS-9897-F, May 2026) affects the
   provider/payer IDR fee, not the patient PPDR fee or thresholds.
