import React, { useState } from "react";
import type { PatientContext } from "../types/models";
import { Button, SectionHeading, InfoBanner } from "./ui";

interface EligibilityGateProps {
  patient: PatientContext;
  onUpdate: (p: PatientContext) => void;
  onNext: () => void;
}

interface ChecklistState {
  uninsuredOrSelfPay: boolean | null;
  toldProvider:       boolean | null;
  careAfter2022:      boolean | null;
  hadGfe:             boolean | null;
}

type CheckKey = keyof ChecklistState;

interface CheckItem {
  key: CheckKey;
  question: string;
  yesLabel: string;
  noLabel: string;
  blockingIfNo: boolean;
  blockingReason?: string;
  nonBlockingNoNote?: string;
}

const CHECKLIST: CheckItem[] = [
  {
    key: "uninsuredOrSelfPay",
    question: "Are you uninsured, or did you choose not to use your insurance to pay for this care?",
    yesLabel: "Yes — I'm uninsured or self-pay",
    noLabel: "No — I used my insurance",
    blockingIfNo: true,
    blockingReason:
      "The GFE/PPDR process applies to uninsured and self-pay patients only. A different part of the No Surprises Act may still protect you from balance billing — but this tool doesn't cover that path.",
  },
  {
    key: "toldProvider",
    question: "Did you tell your provider in advance you weren't using insurance?",
    yesLabel: "Yes",
    noLabel: "No, or I'm not sure",
    blockingIfNo: true,
    blockingReason:
      "Federal rules require that you told the provider upfront about your self-pay status. If you're unsure, check any intake paperwork — providers often document this when generating a GFE.",
  },
  {
    key: "careAfter2022",
    question: "Did you receive this care on or after January 1, 2022?",
    yesLabel: "Yes",
    noLabel: "No — it was before 2022",
    blockingIfNo: true,
    blockingReason:
      "The patient-provider dispute resolution process only covers care received from January 1, 2022 onward.",
  },
  {
    key: "hadGfe",
    question: "Did you receive a Good Faith Estimate from your provider before your appointment?",
    yesLabel: "Yes, I have it",
    noLabel: "No, I never received one",
    blockingIfNo: false,
    nonBlockingNoNote:
      "If you were uninsured and scheduled care at least 3 days in advance, your provider was legally required to give you a GFE. You can request a copy directly from them. This tool requires the GFE to calculate your overage.",
  },
];

export function EligibilityGate({ patient, onUpdate, onNext }: EligibilityGateProps) {
  const [answers, setAnswers] = useState<ChecklistState>({
    uninsuredOrSelfPay: null,
    toldProvider:       null,
    careAfter2022:      null,
    hadGfe:             null,
  });

  function answer(key: CheckKey, value: boolean) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (key === "uninsuredOrSelfPay") {
      onUpdate({ ...patient, billingStatus: value ? "self-pay" : "insured-using-insurance" });
    }
    if (key === "toldProvider") {
      onUpdate({ ...patient, toldProviderNoInsurance: value });
    }
    if (key === "careAfter2022") {
      onUpdate({ ...patient, careOnOrAfterJan2022: value });
    }
  }

  const blockingItem = CHECKLIST.find(
    (item) => item.blockingIfNo && answers[item.key] === false
  );

  // Show questions progressively — one at a time until answered
  const lastAnsweredIdx = CHECKLIST.reduce(
    (acc, item, i) => (answers[item.key] !== null ? i : acc),
    -1
  );
  const visibleCount = Math.min(lastAnsweredIdx + 2, CHECKLIST.length);
  const visibleItems = blockingItem
    ? CHECKLIST.slice(0, CHECKLIST.indexOf(blockingItem) + 1)
    : CHECKLIST.slice(0, visibleCount);

  const allAnswered = CHECKLIST.every((item) => answers[item.key] !== null);
  const canProceed  = allAnswered && !blockingItem;

  return (
    <div className="step-enter">
      <SectionHeading
        title="Let's check if you can dispute your bill."
        subtitle="Answer a few quick questions to see if the federal No Surprises Act gives you the right to dispute."
      />

      <InfoBanner variant="info">
        <strong>Your data never leaves your device.</strong> This tool runs entirely in your browser — nothing is sent to any server.
      </InfoBanner>

      <div style={{ marginTop: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {visibleItems.map((item) => {
          const ans        = answers[item.key];
          const isBlocking = item === blockingItem;

          return (
            <div
              key={item.key}
              role="group"
              aria-labelledby={`q-${item.key}`}
              style={{
                background: "var(--surface)",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid ${isBlocking ? "var(--danger)" : ans !== null ? "var(--accent)" : "var(--border)"}`,
                padding: "var(--space-5) var(--space-6)",
                boxShadow: "var(--shadow-sm)",
                transition: "border-color var(--duration-fast)",
              }}
            >
              <p
                id={`q-${item.key}`}
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: "var(--space-4)",
                  lineHeight: 1.55,
                }}
              >
                {item.question}
              </p>

              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <Button
                  variant={ans === true ? "primary" : "ghost"}
                  onClick={() => answer(item.key, true)}
                  aria-pressed={ans === true}
                >
                  {ans === true && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {item.yesLabel}
                </Button>
                <Button
                  variant={ans === false ? (item.blockingIfNo ? "danger" : "secondary") : "ghost"}
                  onClick={() => answer(item.key, false)}
                  aria-pressed={ans === false}
                >
                  {item.noLabel}
                </Button>
              </div>

              {/* Blocking reason — color + icon + text (not color alone) */}
              {isBlocking && item.blockingReason && (
                <div
                  role="alert"
                  style={{
                    marginTop: "var(--space-4)",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--danger-light)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    color: "var(--danger)",
                    lineHeight: 1.6,
                    display: "flex",
                    gap: "var(--space-2)",
                    alignItems: "flex-start",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="7" cy="7" r="6.5" stroke="var(--danger)" strokeWidth="1.2"/>
                    <path d="M7 4v3.5M7 9.5h.01" stroke="var(--danger)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span><strong>Not eligible via this path.</strong> {item.blockingReason}</span>
                </div>
              )}

              {/* Non-blocking note (GFE not received) */}
              {!item.blockingIfNo && ans === false && item.nonBlockingNoNote && (
                <div
                  style={{
                    marginTop: "var(--space-4)",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--amber-light)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    color: "#7C4A0A",
                    lineHeight: 1.6,
                    display: "flex",
                    gap: "var(--space-2)",
                    alignItems: "flex-start",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M7 1.5L13 12.5H1L7 1.5Z" stroke="#C07010" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M7 5.5v3M7 10h.01" stroke="#C07010" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span>{item.nonBlockingNoNote}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canProceed && (
        <div style={{ marginTop: "var(--space-8)", display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onNext}>
            Enter my Good Faith Estimate
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
