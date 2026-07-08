import React from "react";
import { GeneratePacketButton } from "./GeneratePacketButton";
import type {
  EligibilityResult,
  GoodFaithEstimate,
  ActualBill,
} from "../types/models";
import {
  PPDR_FILING_FEE_DOLLARS,
  DISPUTE_THRESHOLD_DOLLARS,
} from "../rules/eligibility";
import { Button, Card, InfoBanner, SectionHeading } from "./ui";

interface ResultsScreenProps {
  result: EligibilityResult;
  patientName: string;
  gfe: GoodFaithEstimate;
  bill: ActualBill;
  onReset: () => void;
}

export function ResultsScreen({
  result,
  patientName,
  gfe,
  bill,
  onReset,
}: ResultsScreenProps) {
  const {
    eligible,
    reasons,
    providerComparisons,
    eligibleProviders,
    filingDeadline,
    daysRemainingToFile,
  } = result;
  const isUrgent =
    daysRemainingToFile !== undefined && daysRemainingToFile <= 14;

  return (
    <div className="step-enter">
      {/* ── Verdict banner ───────────────────────────────────────── */}
      <div
        role="status"
        aria-live="polite"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8) var(--space-8)",
          marginBottom: "var(--space-6)",
          background: eligible ? "var(--accent)" : "var(--surface)",
          border: eligible ? "none" : "2px solid var(--border)",
          boxShadow: eligible
            ? "0 4px 24px rgba(42,123,111,0.18)"
            : "var(--shadow-sm)",
          color: eligible ? "#fff" : "var(--text-primary)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginBottom: "var(--space-2)",
          }}
        >
          {eligible ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="10"
                cy="10"
                r="9"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.5"
              />
              <path
                d="M6 10l3 3 5-6"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="10"
                cy="10"
                r="9"
                stroke="var(--border)"
                strokeWidth="1.5"
              />
              <path
                d="M10 6v5M10 13.5h.01"
                stroke="var(--text-secondary)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.7,
            }}
          >
            Audit result{patientName ? ` for ${patientName}` : ""}
          </p>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1.2,
            marginBottom: "var(--space-3)",
          }}
        >
          {eligible
            ? "You have the right to dispute this bill."
            : "Your bill doesn't qualify for a formal dispute."}
        </h1>
        <p
          style={{
            fontSize: 15,
            opacity: 0.85,
            lineHeight: 1.65,
            maxWidth: 500,
          }}
        >
          {eligible
            ? `At least one provider billed you $${DISPUTE_THRESHOLD_DOLLARS}+ over their Good Faith Estimate. Under 45 CFR §149.620, you can formally dispute through the federal Patient-Provider Dispute Resolution process.`
            : `Based on the information you entered, the PPDR process doesn't apply here. The specific reasons are listed below.`}
        </p>
      </div>

      {/* ── Deadline countdown — most critical info if eligible ───── */}
      {eligible && filingDeadline && daysRemainingToFile !== undefined && (
        <div
          role="alert"
          style={{
            borderRadius: "var(--radius-md)",
            padding: "var(--space-5) var(--space-6)",
            marginBottom: "var(--space-6)",
            background: isUrgent ? "var(--amber-light)" : "var(--surface)",
            border: `1.5px solid ${isUrgent ? "var(--amber)" : "var(--border)"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-1)",
              }}
            >
              {isUrgent && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 1.5L13 12.5H1L7 1.5Z"
                    stroke="var(--amber)"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 5.5v3M7 10h.01"
                    stroke="var(--amber)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: isUrgent ? "var(--amber)" : "var(--text-secondary)",
                }}
              >
                {isUrgent ? "Urgent: " : ""}Filing deadline
              </p>
            </div>
            <p
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {new Date(filingDeadline + "T12:00:00").toLocaleDateString(
                "en-US",
                {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                },
              )}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 3,
              }}
            >
              120 calendar days from your bill date
            </p>
          </div>
          <div
            style={{
              textAlign: "center",
              background: isUrgent ? "var(--amber)" : "var(--accent)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-3) var(--space-5)",
              minWidth: 96,
            }}
          >
            <p style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
              {daysRemainingToFile}
            </p>
            <p style={{ fontSize: 12, marginTop: 3, opacity: 0.9 }}>
              days remaining
            </p>
          </div>
        </div>
      )}

      {/* ── Per-provider breakdown ────────────────────────────────── */}
      <Card style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={sectionHeading}>Per-provider breakdown</h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-4)",
            lineHeight: 1.55,
          }}
        >
          The $400 dispute threshold is checked separately for each provider —
          not as a combined total. (Source: 45 CFR §149.620)
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {providerComparisons.map((c) => (
            <div
              key={c.provider.id}
              style={{
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${c.meetsThreshold ? "var(--danger)" : "var(--border)"}`,
                background: c.meetsThreshold
                  ? "var(--danger-light)"
                  : "var(--bg)",
                padding: "var(--space-4) var(--space-5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "var(--space-3)",
                }}
              >
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "var(--text-primary)",
                    }}
                  >
                    {c.provider.name}
                  </p>
                  {c.provider.role && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {c.provider.role}
                    </p>
                  )}
                </div>
                {/* Badge: icon + color + text — not color alone */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: 99,
                    background: c.meetsThreshold
                      ? "var(--danger)"
                      : c.overage > 0
                        ? "var(--amber)"
                        : "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {c.meetsThreshold ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 11 11"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5.5 1L10.5 10H.5L5.5 1Z"
                        stroke="#fff"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.5 4.5v2.5M5.5 8.5h.01"
                        stroke="#fff"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : c.overage > 0 ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 11 11"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="5.5"
                        cy="5.5"
                        r="4.5"
                        stroke="#fff"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M5.5 3v3M5.5 7.5h.01"
                        stroke="#fff"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 11 11"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="5.5"
                        cy="5.5"
                        r="4.5"
                        stroke="#fff"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M3.5 5.5l1.5 1.5 2.5-3"
                        stroke="#fff"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {c.meetsThreshold
                    ? "Eligible to dispute"
                    : c.overage > 0
                      ? "Under $400 threshold"
                      : "No overage"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "var(--space-4)",
                  marginTop: "var(--space-4)",
                }}
              >
                <AmountCell label="GFE estimate" amount={c.estimatedTotal} />
                <AmountCell label="Amount billed" amount={c.billedTotal} />
                <AmountCell
                  label="Difference"
                  amount={c.overage}
                  signed
                  color={
                    c.meetsThreshold
                      ? "var(--danger)"
                      : c.overage > 0
                        ? "var(--amber)"
                        : "var(--accent)"
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Ineligibility reasons ─────────────────────────────────── */}
      {!eligible && reasons.length > 0 && (
        <Card style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={sectionHeading}>Why this bill doesn't qualify</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {reasons.map((reason, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  alignItems: "flex-start",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="var(--danger)"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M5.5 5.5l5 5M10.5 5.5l-5 5"
                    stroke="var(--danger)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                    lineHeight: 1.6,
                  }}
                >
                  {reason}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Next steps if eligible ────────────────────────────────── */}
      {eligible && eligibleProviders.length > 0 && (
        <Card style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={sectionHeading}>What happens next</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
            }}
          >
            {(
              [
                {
                  n: "1",
                  title: "File through the federal dispute portal",
                  body: `Submit a Patient-Provider Dispute Resolution initiation notice via the federal portal. You'll pay a $${PPDR_FILING_FEE_DOLLARS} non-refundable filing fee (credit card, PayPal, or Venmo). If you win, the $${PPDR_FILING_FEE_DOLLARS} is deducted from what you owe.`,
                },
                {
                  n: "2",
                  title: "Your bill is paused",
                  body: "Once filed, your provider cannot send your bill to collections, charge late fees, or take retaliatory action. If collections have already started, they must pause.",
                },
                {
                  n: "3",
                  title: "A neutral reviewer decides",
                  body: "An independent dispute resolution entity reviews your GFE and your bill. You and your provider can also continue to negotiate directly during this time.",
                },
                {
                  n: "4",
                  title: "You receive the outcome",
                  body: "The reviewer notifies both you and your provider. If decided in your favor, you pay the GFE-based amount, minus the $25 filing fee.",
                },
              ] as const
            ).map(({ n, title, body }) => (
              <div key={n} style={{ display: "flex", gap: "var(--space-4)" }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--accent-light)",
                    border: "1.5px solid var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "var(--accent)",
                  }}
                >
                  {n}
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-primary)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    {title}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.65,
                    }}
                  >
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Legal footnote ────────────────────────────────────────── */}
      <InfoBanner variant="info">
        <strong>Important:</strong> This tool audits your bill against your GFE
        using federal rules under 45 CFR §149.610–620. It is not legal advice.
        For complex situations, contact the CMS No Surprises Help Desk at
        1-800-985-3059.
      </InfoBanner>

      <div
        style={{
          marginTop: "var(--space-6)",
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <Button variant="ghost" onClick={onReset}>
          Start a new audit
        </Button>
        {eligible && (
          <div
            style={{
              marginTop: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {eligible && (
              <GeneratePacketButton gfe={gfe} bill={bill} result={result} />
            )}
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <Button variant="ghost" onClick={onReset}>
                Start a new audit
              </Button>
              {eligible && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    window.open(
                      "https://www.cms.gov/nosurprises/consumers/disputing-a-bill",
                      "_blank",
                      "noopener noreferrer",
                    )
                  }
                >
                  Go to federal dispute portal →
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AmountCell({
  label,
  amount,
  signed = false,
  color = "var(--text-primary)",
}: {
  label: string;
  amount: number;
  signed?: boolean;
  color?: string;
}) {
  const abs = Math.abs(amount);
  const formatted = signed
    ? `${amount > 0 ? "+" : amount < 0 ? "−" : ""}$${abs.toFixed(2)}`
    : `$${abs.toFixed(2)}`;
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginBottom: "var(--space-1)",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 700, color }}>{formatted}</p>
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: "var(--space-3)",
};
