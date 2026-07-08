import { describe, it, expect } from "vitest";
import {
  compareByProvider,
  evaluateEligibility,
  getFilingDeadline,
  isWithinFilingWindow,
  daysRemainingToFile,
  DISPUTE_THRESHOLD_DOLLARS,
  FILING_WINDOW_DAYS,
} from "../eligibility";
import type {
  ActualBill,
  GoodFaithEstimate,
  PatientContext,
  Provider,
} from "../../types/models";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const surgeon: Provider = { id: "p1", name: "Dr. Alvarez", role: "surgeon" };
const facility: Provider = { id: "p2", name: "Riverside Surgical Center", role: "facility" };
const anesthesiologist: Provider = { id: "p3", name: "Dr. Kim", role: "anesthesiologist" };

const eligiblePatient: PatientContext = {
  billingStatus: "uninsured",
  toldProviderNoInsurance: true,
  careOnOrAfterJan2022: true,
}

function makeGfe(overrides: Partial<GoodFaithEstimate> = {}): GoodFaithEstimate {
  return {
    patientName: "Varsha Test",
    patientDateOfBirth: "2000-01-01",
    primaryServiceDescription: "Knee arthroscopy",
    dateIssued: "2026-01-01",
    dateScheduled: "2026-01-15",
    providers: [surgeon, facility],
    lineItems: [
      { id: "l1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 },
      { id: "l2", providerId: facility.id, description: "Facility fee", amount: 3000 },
    ],
    ...overrides,
  };
}

function makeBill(overrides: Partial<ActualBill> = {}): ActualBill {
  return {
    patientName: "Varsha Test",
    dateReceived: "2026-02-01",
    providers: [surgeon, facility],
    lineItems: [
      { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 },
      { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// compareByProvider — spec §3
// ---------------------------------------------------------------------------

describe("compareByProvider", () => {
  it("returns zero overage when bill matches GFE exactly", () => {
    const result = compareByProvider(makeGfe(), makeBill());
    expect(result).toHaveLength(2);
    for (const c of result) {
      expect(c.overage).toBe(0);
      expect(c.meetsThreshold).toBe(false);
    }
  });

  it("flags only the provider whose overage clears the threshold, per spec §3", () => {
    const bill = makeBill({
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2500 }, // +500, over
        { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3100 }, // +100, under
      ],
    });
    const result = compareByProvider(makeGfe(), bill);
    const surgeonResult = result.find((c) => c.provider.id === surgeon.id)!;
    const facilityResult = result.find((c) => c.provider.id === facility.id)!;

    expect(surgeonResult.overage).toBe(500);
    expect(surgeonResult.meetsThreshold).toBe(true);

    expect(facilityResult.overage).toBe(100);
    expect(facilityResult.meetsThreshold).toBe(false);
  });

  it("boundary: exactly $400 overage meets the threshold ('$400 or more')", () => {
    const bill = makeBill({
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2400 }, // exactly +400
        { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
      ],
    });
    const result = compareByProvider(makeGfe(), bill);
    const surgeonResult = result.find((c) => c.provider.id === surgeon.id)!;
    expect(surgeonResult.overage).toBe(DISPUTE_THRESHOLD_DOLLARS);
    expect(surgeonResult.meetsThreshold).toBe(true);
  });

  it("boundary: $399.99 overage does NOT meet the threshold", () => {
    const bill = makeBill({
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2399.99 },
        { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
      ],
    });
    const result = compareByProvider(makeGfe(), bill);
    const surgeonResult = result.find((c) => c.provider.id === surgeon.id)!;
    expect(surgeonResult.overage).toBe(399.99);
    expect(surgeonResult.meetsThreshold).toBe(false);
  });

  it("does NOT use a naive total-vs-total comparison (the common bug)", () => {
    // Surgeon comes in $1000 UNDER estimate, facility comes in $450 OVER.
    // A naive total-vs-total comparison would net these out to a $550
    // overall overage and miss that the facility individually qualifies.
    const gfe = makeGfe({
      lineItems: [
        { id: "l1", providerId: surgeon.id, description: "Surgeon fee", amount: 3000 },
        { id: "l2", providerId: facility.id, description: "Facility fee", amount: 2000 },
      ],
    });
    const bill = makeBill({
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 }, // -1000
        { id: "b2", providerId: facility.id, description: "Facility fee", amount: 2450 }, // +450
      ],
    });
    const result = compareByProvider(gfe, bill);
    const facilityResult = result.find((c) => c.provider.id === facility.id)!;
    const surgeonResult = result.find((c) => c.provider.id === surgeon.id)!;

    expect(facilityResult.meetsThreshold).toBe(true);
    expect(facilityResult.overage).toBe(450);
    expect(surgeonResult.overage).toBe(-1000);
    expect(surgeonResult.meetsThreshold).toBe(false);
  });

  it("treats a provider missing from the GFE as a $0 estimate (undisclosed provider)", () => {
    const gfe = makeGfe({
      providers: [surgeon],
      lineItems: [{ id: "l1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 }],
    });
    const bill = makeBill({
      providers: [surgeon, anesthesiologist],
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 },
        {
          id: "b2",
          providerId: anesthesiologist.id,
          description: "Anesthesia fee",
          amount: 800,
        },
      ],
    });
    const result = compareByProvider(gfe, bill);
    const anesthesiaResult = result.find((c) => c.provider.id === anesthesiologist.id)!;

    expect(anesthesiaResult.estimatedTotal).toBe(0);
    expect(anesthesiaResult.billedTotal).toBe(800);
    expect(anesthesiaResult.overage).toBe(800);
    expect(anesthesiaResult.meetsThreshold).toBe(true);
  });

  it("treats a provider missing from the bill as $0 billed (estimate never charged)", () => {
    const gfe = makeGfe({
      providers: [surgeon, anesthesiologist],
      lineItems: [
        { id: "l1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 },
        {
          id: "l2",
          providerId: anesthesiologist.id,
          description: "Anesthesia fee",
          amount: 800,
        },
      ],
    });
    const bill = makeBill({
      providers: [surgeon],
      lineItems: [{ id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 }],
    });
    const result = compareByProvider(gfe, bill);
    const anesthesiaResult = result.find((c) => c.provider.id === anesthesiologist.id)!;

    expect(anesthesiaResult.billedTotal).toBe(0);
    expect(anesthesiaResult.overage).toBe(-800);
    expect(anesthesiaResult.meetsThreshold).toBe(false);
  });

  it("sums multiple line items per provider before comparing", () => {
    const gfe = makeGfe({
      lineItems: [
        { id: "l1", providerId: surgeon.id, description: "Surgeon fee", amount: 1500 },
        { id: "l2", providerId: surgeon.id, description: "Follow-up visit", amount: 500 },
        { id: "l3", providerId: facility.id, description: "Facility fee", amount: 3000 },
      ],
    });
    const result = compareByProvider(gfe, makeBill());
    const surgeonResult = result.find((c) => c.provider.id === surgeon.id)!;
    expect(surgeonResult.estimatedTotal).toBe(2000); // 1500 + 500
    expect(surgeonResult.overage).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Filing window — spec §4
// ---------------------------------------------------------------------------

describe("filing deadline and window (120 calendar days)", () => {
  it("computes the deadline as bill date + 120 calendar days", () => {
    expect(getFilingDeadline("2026-01-01")).toBe("2026-05-01");
  });

  it("correctly spans a leap year (2028) without drift", () => {
    // 2028 is a leap year; this guards against off-by-one bugs from Feb 29.
    const deadline = getFilingDeadline("2028-01-15");
    expect(daysRemainingToFile("2028-01-15", deadline)).toBe(0);
  });

  it("boundary: exactly day 120 is still within the window (inclusive)", () => {
    const billDate = "2026-01-01";
    const deadline = getFilingDeadline(billDate); // 2026-05-01
    expect(isWithinFilingWindow(billDate, deadline)).toBe(true);
  });

  it("boundary: day 121 is past the window", () => {
    const billDate = "2026-01-01";
    const dayAfterDeadline = "2026-05-02";
    expect(isWithinFilingWindow(billDate, dayAfterDeadline)).toBe(false);
  });

  it("day 0 (bill received today) is within the window", () => {
    expect(isWithinFilingWindow("2026-03-01", "2026-03-01")).toBe(true);
  });

  it("daysRemainingToFile counts down correctly and goes negative after expiry", () => {
    const billDate = "2026-01-01";
    expect(daysRemainingToFile(billDate, "2026-01-01")).toBe(FILING_WINDOW_DAYS);
    expect(daysRemainingToFile(billDate, "2026-05-01")).toBe(0);
    expect(daysRemainingToFile(billDate, "2026-05-02")).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// evaluateEligibility — full integration of spec §1, §3, §4
// ---------------------------------------------------------------------------

describe("evaluateEligibility", () => {
  it("is eligible when all CMS checklist conditions are met", () => {
    const gfe = makeGfe();
    const bill = makeBill({
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2500 },
        { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
      ],
    });
    const result = evaluateEligibility(gfe, bill, eligiblePatient, "2026-02-15");

    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.eligibleProviders).toHaveLength(1);
    expect(result.eligibleProviders[0].provider.id).toBe(surgeon.id);
    expect(result.filingDeadline).toBe("2026-06-01");
    expect(result.daysRemainingToFile).toBeGreaterThan(0);
  });

  it("is ineligible when patient is insured and using insurance (spec §1)", () => {
    const result = evaluateEligibility(
      makeGfe(),
      makeBill({
        lineItems: [
          { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2500 },
          { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
        ],
      }),
      { ...eligiblePatient, billingStatus: "insured-using-insurance" },
      "2026-02-15"
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes("uninsured and self-pay"))).toBe(true);
  });

  it("is ineligible when patient never told the provider about not using insurance", () => {
    const result = evaluateEligibility(
      makeGfe(),
      makeBill({
        lineItems: [
          { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2500 },
          { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
        ],
      }),
      { ...eligiblePatient, toldProviderNoInsurance: false },
      "2026-02-15"
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes("told your provider in advance"))).toBe(true);
  });

  it("is ineligible when no provider individually clears the $400 threshold", () => {
    // Both providers slightly over, but neither clears $400 individually.
    const bill = makeBill({
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2200 }, // +200
        { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3300 }, // +300
      ],
    });
    const result = evaluateEligibility(makeGfe(), bill, eligiblePatient, "2026-02-15");

    expect(result.eligible).toBe(false);
    expect(result.eligibleProviders).toHaveLength(0);
    expect(result.reasons.some((r) => r.includes("per provider"))).toBe(true);
    // Transparency: full breakdown still returned even though ineligible.
    expect(result.providerComparisons).toHaveLength(2);
  });

  it("is ineligible once the 120-day filing window has passed", () => {
    const bill = makeBill({
      dateReceived: "2026-01-01",
      lineItems: [
        { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2500 },
        { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
      ],
    });
    // 2026-01-01 + 121 days = 2026-05-02, one day past deadline.
    const result = evaluateEligibility(makeGfe(), bill, eligiblePatient, "2026-05-02");

    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes("120-calendar-day"))).toBe(true);
    expect(result.filingDeadline).toBeUndefined();
  });

  it("is ineligible when care was received before the PPDR effective date (Jan 1, 2022)", () => {
    const result = evaluateEligibility(
      makeGfe(),
      makeBill({
        lineItems: [
          { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2500 },
          { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
        ],
      }),
      { ...eligiblePatient, careOnOrAfterJan2022: false },
      "2026-02-15"
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes("January 1, 2022"))).toBe(true);
  });

  it("accumulates multiple simultaneous ineligibility reasons", () => {
    const result = evaluateEligibility(
      makeGfe(),
      makeBill({
        lineItems: [
          { id: "b1", providerId: surgeon.id, description: "Surgeon fee", amount: 2000 },
          { id: "b2", providerId: facility.id, description: "Facility fee", amount: 3000 },
        ],
      }),
      { billingStatus: "insured-using-insurance", toldProviderNoInsurance: false, careOnOrAfterJan2022: true },
      "2026-02-15"
    );
    expect(result.eligible).toBe(false);
    // insured + didn't tell provider + no overage at all = 3 independent reasons
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
