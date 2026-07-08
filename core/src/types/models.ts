/**
 * Core data model for the GFE Bill Auditor.
 *
 * Design principle (see docs/RULE_ENGINE_SPEC.md §3 and §6): the $400
 * dispute threshold is evaluated PER PROVIDER/FACILITY, not as a single
 * GFE-total-vs-bill-total comparison. Every entity below is structured so
 * that grouping by provider is a first-class operation, not something
 * bolted on later.
 */

/** Patient's insurance/billing status — gates eligibility entirely. */
export type BillingStatus = "uninsured" | "self-pay" | "insured-using-insurance";

/**
 * A provider or facility that can issue an estimate and a bill.
 * NPI = National Provider Identifier, TIN = Tax ID Number — both appear
 * on real GFEs per 45 CFR 149.610 content requirements (spec §6).
 */
export interface Provider {
  /** Stable id used to match the same provider across GFE and Bill. */
  id: string;
  name: string;
  npi?: string;
  tin?: string;
  /** e.g. "surgeon", "facility", "anesthesiologist" — for display only. */
  role?: string;
}

/** A single itemized line on a GFE or a bill. */
export interface LineItem {
  id: string;
  providerId: string;
  description: string;
  /** CPT/HCPCS or similar service code, if known. */
  serviceCode?: string;
  /** ICD-10 or similar diagnosis code, if known. */
  diagnosisCode?: string;
  /** Dollar amount for this line item. */
  amount: number;
}

/**
 * Good Faith Estimate — what 45 CFR 149.610 requires providers to give
 * uninsured/self-pay patients before a scheduled item or service.
 */
export interface GoodFaithEstimate {
  patientName: string;
  patientDateOfBirth: string; // ISO date string, e.g. "1998-04-12"
  /** Description of the primary scheduled item/service. */
  primaryServiceDescription: string;
  /** Date the GFE was actually given to the patient. */
  dateIssued: string; // ISO date
  /** Date the item/service was scheduled for. */
  dateScheduled: string; // ISO date
  providers: Provider[];
  lineItems: LineItem[];
}

/** The actual bill the patient later receives. */
export interface ActualBill {
  patientName: string;
  /** Date the patient received this bill — starts the 120-day clock. */
  dateReceived: string; // ISO date
  providers: Provider[];
  lineItems: LineItem[];
}

/** Patient-specific facts needed for the eligibility gate (spec §1, §4). */
export interface PatientContext {
  billingStatus: BillingStatus;
  /** Did the patient tell the provider in advance they weren't using insurance? */
  toldProviderNoInsurance: boolean;
  /** Was care received on or after Jan 1, 2022 (PPDR effective date)? */
  careOnOrAfterJan2022: boolean;
}

/** Per-provider rollup used by the rule engine — the heart of spec §3. */
export interface ProviderComparison {
  provider: Provider;
  estimatedTotal: number;
  billedTotal: number;
  /** billedTotal - estimatedTotal. Can be negative (came in under estimate). */
  overage: number;
  /** True only if overage >= 400 — the actual dispute trigger. */
  meetsThreshold: boolean;
}

/** Top-level eligibility verdict returned by the rule engine. */
export interface EligibilityResult {
  eligible: boolean;
  /** Human-readable reasons — every ineligible result must have at least one. */
  reasons: string[];
  /** Per-provider breakdown, always returned for transparency even if ineligible. */
  providerComparisons: ProviderComparison[];
  /** Only the providers that individually cleared the $400 threshold. */
  eligibleProviders: ProviderComparison[];
  /** Filing deadline if eligible; undefined if not eligible or bill not yet provided. */
  filingDeadline?: string; // ISO date
  /** Days remaining until the filing deadline, from "today". Negative if expired. */
  daysRemainingToFile?: number;
}
