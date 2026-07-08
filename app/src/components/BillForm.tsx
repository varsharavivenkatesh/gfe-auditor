import React from "react";
import type { AppState, DraftLineItem } from "../hooks/useAppState";
import { Button, Card, Divider, IconButton, InfoBanner, Input, SectionHeading } from "./ui";
import { DISPUTE_THRESHOLD_DOLLARS } from "../rules/eligibility";

interface BillFormProps {
  billDraft: AppState["billDraft"];
  gfeDraft:  AppState["gfeDraft"];
  onUpdateBill:     (updates: Partial<AppState["billDraft"]>) => void;
  onAddLineItem:    (providerId: string) => void;
  onUpdateLineItem: (id: string, updates: Partial<DraftLineItem>) => void;
  onRemoveLineItem: (id: string) => void;
  onBack: () => void;
  onRun:  () => void;
}

type OverageStatus = "eligible" | "close" | "over" | "under" | "none";

function overageStatus(diff: number, gfeTotal: number): OverageStatus {
  if (gfeTotal === 0) return "none";
  if (diff >= DISPUTE_THRESHOLD_DOLLARS)       return "eligible";
  if (diff > 0 && diff < DISPUTE_THRESHOLD_DOLLARS) return diff >= DISPUTE_THRESHOLD_DOLLARS * 0.75 ? "close" : "over";
  if (diff < 0) return "under";
  return "none";
}

// Color + label pair so color is never the only indicator
const OVERAGE_DISPLAY: Record<OverageStatus, { color: string; icon: React.ReactNode; label: (d: number) => string }> = {
  eligible: {
    color: "var(--danger)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M6.5 1.5L12 11.5H1L6.5 1.5Z" stroke="var(--danger)" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M6.5 5v3M6.5 10h.01" stroke="var(--danger)" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    label: (d) => `+$${d.toFixed(2)} over estimate — may qualify to dispute`,
  },
  close: {
    color: "var(--amber)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M6.5 1.5L12 11.5H1L6.5 1.5Z" stroke="var(--amber)" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M6.5 5v3M6.5 10h.01" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    label: (d) => `+$${d.toFixed(2)} over estimate — below $${DISPUTE_THRESHOLD_DOLLARS} threshold`,
  },
  over: {
    color: "var(--amber)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <path d="M6.5 1.5L12 11.5H1L6.5 1.5Z" stroke="var(--amber)" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M6.5 5v3M6.5 10h.01" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    label: (d) => `+$${d.toFixed(2)} over estimate — below $${DISPUTE_THRESHOLD_DOLLARS} threshold`,
  },
  under: {
    color: "var(--accent)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="5.5" stroke="var(--accent)" strokeWidth="1.3"/>
        <path d="M4 6.5l2 2 3.5-3.5" stroke="var(--accent)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: (d) => `$${Math.abs(d).toFixed(2)} under estimate`,
  },
  none: {
    color: "var(--text-muted)",
    icon: null,
    label: () => "Matches estimate",
  },
};

export function BillForm({
  billDraft, gfeDraft,
  onUpdateBill, onAddLineItem, onUpdateLineItem, onRemoveLineItem,
  onBack, onRun,
}: BillFormProps) {
  const gfeTotal  = (pid: string) =>
    gfeDraft.lineItems.filter((l) => l.providerId === pid)
      .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const billTotal = (pid: string) =>
    billDraft.lineItems.filter((l) => l.providerId === pid)
      .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const allComplete = billDraft.lineItems.every(
    (l) => l.description.trim() && l.amount.trim() && parseFloat(l.amount) >= 0
  );
  const canRun = !!billDraft.dateReceived && allComplete;

  return (
    <div className="step-enter">
      <SectionHeading
        title="Enter your actual bill"
        subtitle="Enter what each provider actually charged you. The same providers from your GFE are listed below."
      />

      <InfoBanner variant="warning">
        <strong>Deadline alert:</strong> You have exactly 120 calendar days from the date on your bill to file a dispute. Enter the bill date carefully — we'll show your deadline immediately.
      </InfoBanner>

      <div style={{ marginTop: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

        {/* Bill date */}
        <Card>
          <p style={cardTitle}>Bill details</p>
          <div style={{ maxWidth: 280, marginTop: "var(--space-4)" }}>
            <Input
              label="Date you received this bill"
              hint="This starts your 120-day dispute window."
              type="date"
              value={billDraft.dateReceived}
              onChange={(e) => onUpdateBill({ dateReceived: e.target.value })}
            />
          </div>
        </Card>

        {/* Per-provider bill entry */}
        {gfeDraft.providers.map((provider) => {
          const billItems  = billDraft.lineItems.filter((l) => l.providerId === provider.id);
          const gfe        = gfeTotal(provider.id);
          const billed     = billTotal(provider.id);
          const diff       = billed - gfe;
          const status     = overageStatus(diff, gfe);
          const display    = OVERAGE_DISPLAY[status];

          return (
            <Card key={provider.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
                <div>
                  <p style={cardTitle}>{provider.name || "Provider"}</p>
                  {provider.role && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginTop: 2 }}>
                      {provider.role}
                    </span>
                  )}
                </div>
                {gfe > 0 && (
                  <div style={{
                    fontSize: 13, color: "var(--text-secondary)",
                    background: "var(--accent-light)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-1) var(--space-3)",
                    whiteSpace: "nowrap",
                  }}>
                    GFE estimate: <strong>${gfe.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              <Divider label="Actual charges from your bill" />

              <div role="list" aria-label={`Actual charges for ${provider.name || "this provider"}`}
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {billItems.map((item, idx) => (
                  <div key={item.id} role="listitem">
                    <BillLineItemRow
                      item={item}
                      index={idx + 1}
                      showRemove={billItems.length > 1}
                      onUpdate={(u) => onUpdateLineItem(item.id, u)}
                      onRemove={() => onRemoveLineItem(item.id)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
                <Button variant="ghost" size="sm" onClick={() => onAddLineItem(provider.id)}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  Add line item
                </Button>

                {billed > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                      Billed: <strong>${billed.toFixed(2)}</strong>
                    </span>
                    {gfe > 0 && (
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: display.color,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {display.icon}
                        {display.label(diff)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={navRow}>
        <Button variant="ghost" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Button>
        <Button onClick={onRun} disabled={!canRun}>
          Run audit
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Button>
      </div>
    </div>
  );
}

function BillLineItemRow({ item, index, showRemove, onUpdate, onRemove }: {
  item: DraftLineItem; index: number; showRemove: boolean;
  onUpdate: (u: Partial<DraftLineItem>) => void; onRemove: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 136px 44px", gap: "var(--space-2)", alignItems: "end" }}>
      <Input
        label={`Line item ${index} description`}
        placeholder="e.g. Surgical services"
        value={item.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        style={{ fontSize: 15 }}
      />
      <div>
        <label
          htmlFor={`bill-amount-${item.id}`}
          style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "var(--space-1)" }}
        >
          Amount
        </label>
        <div style={{ position: "relative" }}>
          <span aria-hidden="true" style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-secondary)", fontSize: 14, pointerEvents: "none",
          }}>$</span>
          <input
            id={`bill-amount-${item.id}`}
            type="number" min="0" step="0.01" placeholder="0.00"
            value={item.amount}
            onChange={(e) => onUpdate({ amount: e.target.value })}
            aria-label={`Amount for line item ${index}`}
            style={{
              paddingLeft: 24, paddingRight: "var(--space-3)",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: 15, minHeight: "var(--touch-min)",
              width: "100%", fontFamily: "var(--font-body)",
            }}
          />
        </div>
      </div>
      {showRemove
        ? <IconButton label={`Remove line item ${index}`} onClick={onRemove} style={{ alignSelf: "end" }} />
        : <div style={{ minHeight: "var(--touch-min)" }} />
      }
    </div>
  );
}

const cardTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "var(--text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.07em",
};
const navRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginTop: "var(--space-8)",
};
