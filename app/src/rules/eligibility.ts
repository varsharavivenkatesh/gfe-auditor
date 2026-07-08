/**
 * Rule engine for the GFE Bill Auditor.
 *
 * Every function here implements a numbered rule from
 * docs/RULE_ENGINE_SPEC.md. Comments reference the spec section so the
 * legal source for each branch is traceable.
 */

import type {
  ActualBill,
  EligibilityResult,
  GoodFaithEstimate,
  PatientContext,
  Provider,
  ProviderComparison,
} from "../types/models";

/** Spec §3: the dispute trigger threshold, in dollars. */
export const DISPUTE_THRESHOLD_DOLLARS = 400;

/** Spec §4: the filing window, in calendar days from bill receipt. */
export const FILING_WINDOW_DAYS = 120;

/** Spec §4 / CMS PPDR fee page: patient-side filing fee, in dollars. */
export const PPDR_FILING_FEE_DOLLARS = 25;

// ---------------------------------------------------------------------------
// Date helpers (kept tiny and dependency-free; calendar days, not business days)
// ---------------------------------------------------------------------------

/** Parses an ISO date string (YYYY-MM-DD) as a UTC date, avoiding TZ drift. */
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addCalendarDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive day count between two ISO dates (b - a), can be negative. */
function daysBetween(aIso: string, bIso: string): number {
  const a = parseIsoDate(aIso);
  const b = parseIsoDate(bIso);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

// ---------------------------------------------------------------------------
// Spec §3: per-provider comparison — the rule most naive implementations get wrong
// ---------------------------------------------------------------------------

/**
 * Groups GFE and Bill line items by provider and computes the overage for
 * each provider independently. A provider present on only one document
 * (GFE-only or bill-only) is still included, with the missing side treated
 * as $0 — this surfaces undisclosed-provider scenarios correctly rather
 * than silently dropping them (see spec §3 edge cases).
 */
export function compareByProvider(
  gfe: GoodFaithEstimate,
  bill: ActualBill
): ProviderComparison[] {
  const providerById = new Map<string, Provider>();
  for (const p of [...gfe.providers, ...bill.providers]) {
    providerById.set(p.id, providerById.get(p.id) ?? p);
  }

  const estimatedTotals = sumByProvider(gfe.lineItems);
  const billedTotals = sumByProvider(bill.lineItems);

  const allProviderIds = new Set([
    ...estimatedTotals.keys(),
    ...billedTotals.keys(),
  ]);

  const comparisons: ProviderComparison[] = [];
  for (const providerId of allProviderIds) {
    const provider = providerById.get(providerId);
    if (!provider) continue; // defensive: shouldn't happen given map construction above

    const estimatedTotal = round2(estimatedTotals.get(providerId) ?? 0);
    const billedTotal = round2(billedTotals.get(providerId) ?? 0);
    const overage = round2(billedTotal - estimatedTotal);

    comparisons.push({
      provider,
      estimatedTotal,
      billedTotal,
      overage,
      meetsThreshold: overage >= DISPUTE_THRESHOLD_DOLLARS,
    });
  }

  // Stable, readable ordering for UI/tests: largest overage first.
  return comparisons.sort((a, b) => b.overage - a.overage);
}

function sumByProvider(
  lineItems: { providerId: string; amount: number }[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of lineItems) {
    totals.set(item.providerId, (totals.get(item.providerId) ?? 0) + item.amount);
  }
  return totals;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Spec §4: filing deadline
// ---------------------------------------------------------------------------

/** Spec §4: deadline is bill-received-date + 120 calendar days, inclusive. */
export function getFilingDeadline(billDateReceived: string): string {
  return addCalendarDays(billDateReceived, FILING_WINDOW_DAYS);
}

/**
 * Spec §4: filing window is inclusive of day 120 itself.
 * `today` defaults to the real current date but is injectable for testing.
 */
export function isWithinFilingWindow(
  billDateReceived: string,
  today: string
): boolean {
  const elapsed = daysBetween(billDateReceived, today);
  return elapsed >= 0 && elapsed <= FILING_WINDOW_DAYS;
}

export function daysRemainingToFile(
  billDateReceived: string,
  today: string
): number {
  const deadline = getFilingDeadline(billDateReceived);
  return daysBetween(today, deadline);
}

// ---------------------------------------------------------------------------
// Spec §1: top-level eligibility gate
// ---------------------------------------------------------------------------

/**
 * Full eligibility determination, combining:
 *  - Spec §1: billing status gate (uninsured / self-pay only)
 *  - Spec §3: per-provider $400 threshold
 *  - Spec §4: 120-day filing window
 *
 * Always returns the full per-provider breakdown (`providerComparisons`),
 * even when ineligible, so the UI/tool can show transparent math rather
 * than a bare yes/no.
 */
export function evaluateEligibility(
  gfe: GoodFaithEstimate,
  bill: ActualBill,
  patient: PatientContext,
  today: string = new Date().toISOString().slice(0, 10)
): EligibilityResult {
  const reasons: string[] = [];
  const providerComparisons = compareByProvider(gfe, bill);
  const eligibleProviders = providerComparisons.filter((c) => c.meetsThreshold);

  // Spec §1: billing status gate.
  if (patient.billingStatus === "insured-using-insurance") {
    reasons.push(
      "This tool covers the GFE/PPDR process for uninsured and self-pay patients only. " +
        "Your situation may be covered by different No Surprises Act protections (balance billing)."
    );
  }

  // Spec: CMS checklist item — must have told the provider in advance.
  if (!patient.toldProviderNoInsurance) {
    reasons.push(
      "PPDR eligibility requires that you told your provider in advance you weren't using insurance to pay."
    );
  }

  // Spec: CMS checklist item — PPDR effective date.
  if (!patient.careOnOrAfterJan2022) {
    reasons.push(
      "The patient-provider dispute resolution process only applies to care received on or after January 1, 2022."
    );
  }

  // Spec §3: at least one provider must individually clear the $400 threshold.
  if (eligibleProviders.length === 0) {
    reasons.push(
      `No single provider's billed amount exceeded its Good Faith Estimate by $${DISPUTE_THRESHOLD_DOLLARS} or more. ` +
        "The comparison is done per provider, not as a total across your whole bill."
    );
  }

  // Spec §4: 120-day filing window from bill receipt.
  const withinWindow = isWithinFilingWindow(bill.dateReceived, today);
  if (!withinWindow) {
    reasons.push(
      `The 120-calendar-day filing window from your bill date (${bill.dateReceived}) has passed.`
    );
  }

  const eligible = reasons.length === 0;

  const result: EligibilityResult = {
    eligible,
    reasons,
    providerComparisons,
    eligibleProviders,
  };

  if (eligible) {
    result.filingDeadline = getFilingDeadline(bill.dateReceived);
    result.daysRemainingToFile = daysRemainingToFile(bill.dateReceived, today);
  }

  return result;
}
