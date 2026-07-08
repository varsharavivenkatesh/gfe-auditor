import React from "react";
import type { AppState, DraftLineItem, DraftProvider } from "../hooks/useAppState";
import { Button, Card, Divider, IconButton, InfoBanner, Input, Select, SectionHeading } from "./ui";

interface GfeFormProps {
  gfeDraft: AppState["gfeDraft"];
  onUpdateGfe: (updates: Partial<AppState["gfeDraft"]>) => void;
  onAddProvider: () => void;
  onUpdateProvider: (id: string, updates: Partial<DraftProvider>) => void;
  onRemoveProvider: (id: string) => void;
  onAddLineItem: (providerId: string) => void;
  onUpdateLineItem: (id: string, updates: Partial<DraftLineItem>) => void;
  onRemoveLineItem: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function GfeForm({
  gfeDraft, onUpdateGfe,
  onAddProvider, onUpdateProvider, onRemoveProvider,
  onAddLineItem, onUpdateLineItem, onRemoveLineItem,
  onBack, onNext,
}: GfeFormProps) {
  const providerTotal = (pid: string) =>
    gfeDraft.lineItems
      .filter((l) => l.providerId === pid)
      .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const canProceed =
    gfeDraft.patientName.trim() &&
    gfeDraft.dateIssued &&
    gfeDraft.primaryServiceDescription.trim() &&
    gfeDraft.providers.length > 0 &&
    gfeDraft.providers.every((p) => p.name.trim()) &&
    gfeDraft.lineItems.length > 0 &&
    gfeDraft.lineItems.every((l) => l.description.trim() && parseFloat(l.amount) > 0);

  return (
    <div className="step-enter">
      <SectionHeading
        title="Enter your Good Faith Estimate"
        subtitle="Enter the charges exactly as they appear on the GFE your provider gave you before your appointment."
      />

      <InfoBanner variant="info">
        The GFE lists charges <strong>grouped by provider</strong> — surgeon, facility, and anesthesiologist separately. Enter each provider below, because the $400 dispute threshold is checked per provider, not as a single total.
      </InfoBanner>

      <div style={{ marginTop: "var(--space-8)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

        {/* ── Patient & visit ─────────────────────────────────────── */}
        <Card>
          <p style={cardTitle}>Patient &amp; visit details</p>
          <div style={twoCol}>
            <Input
              label="Patient name (as on the GFE)"
              placeholder="Full name"
              value={gfeDraft.patientName}
              onChange={(e) => onUpdateGfe({ patientName: e.target.value })}
              autoComplete="name"
            />
            <Input
              label="Primary service"
              placeholder="e.g. Knee arthroscopy"
              value={gfeDraft.primaryServiceDescription}
              onChange={(e) => onUpdateGfe({ primaryServiceDescription: e.target.value })}
            />
            <Input
              label="Date GFE was given to you"
              type="date"
              value={gfeDraft.dateIssued}
              onChange={(e) => onUpdateGfe({ dateIssued: e.target.value })}
            />
            <Input
              label="Date of scheduled appointment"
              type="date"
              value={gfeDraft.dateScheduled}
              onChange={(e) => onUpdateGfe({ dateScheduled: e.target.value })}
            />
          </div>
        </Card>

        {/* ── Per-provider sections ────────────────────────────────── */}
        {gfeDraft.providers.map((provider) => {
          const items = gfeDraft.lineItems.filter((l) => l.providerId === provider.id);
          const total = providerTotal(provider.id);
          return (
            <Card key={provider.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                <p style={cardTitle}>Provider / facility</p>
                {gfeDraft.providers.length > 1 && (
                  <Button variant="danger" size="sm" onClick={() => onRemoveProvider(provider.id)}>
                    Remove provider
                  </Button>
                )}
              </div>

              <div style={{ ...twoCol, marginBottom: "var(--space-5)" }}>
                <Input
                  label="Provider or facility name"
                  placeholder="e.g. Dr. Santos, Riverside Surgery Center"
                  value={provider.name}
                  onChange={(e) => onUpdateProvider(provider.id, { name: e.target.value })}
                />
                <Select
                  label="Type"
                  value={provider.role}
                  onChange={(e) => onUpdateProvider(provider.id, { role: e.target.value })}
                >
                  <option value="">Select type…</option>
                  <option value="Physician / Surgeon">Physician / Surgeon</option>
                  <option value="Hospital / Facility">Hospital / Facility</option>
                  <option value="Anesthesiologist">Anesthesiologist</option>
                  <option value="Radiologist">Radiologist</option>
                  <option value="Pathologist">Pathologist</option>
                  <option value="Lab / Diagnostic">Lab / Diagnostic</option>
                  <option value="Other">Other</option>
                </Select>
              </div>

              <Divider label="Estimated charges on GFE" />

              <div role="list" aria-label={`Estimated line items for ${provider.name || "this provider"}`}
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {items.map((item, idx) => (
                  <div key={item.id} role="listitem">
                    <LineItemRow
                      item={item}
                      index={idx + 1}
                      showRemove={items.length > 1}
                      onUpdate={(u) => onUpdateLineItem(item.id, u)}
                      onRemove={() => onRemoveLineItem(item.id)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button variant="ghost" size="sm" onClick={() => onAddLineItem(provider.id)}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  Add line item
                </Button>
                {total > 0 && (
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                    Estimated total: <strong>${total.toFixed(2)}</strong>
                  </span>
                )}
              </div>
            </Card>
          );
        })}

        <Button variant="secondary" onClick={onAddProvider} style={{ alignSelf: "flex-start" }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          Add another provider or facility
        </Button>
      </div>

      <div style={navRow}>
        <Button variant="ghost" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M11 7H3M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Enter my actual bill
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Button>
      </div>
    </div>
  );
}

// ── Line item row ─────────────────────────────────────────────────────────────

function LineItemRow({ item, index, showRemove, onUpdate, onRemove }: {
  item: DraftLineItem;
  index: number;
  showRemove: boolean;
  onUpdate: (u: Partial<DraftLineItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 136px 44px", gap: "var(--space-2)", alignItems: "end" }}>
      <Input
        label={`Line item ${index} description`}
        placeholder="e.g. Office consultation"
        value={item.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        style={{ fontSize: 15 }}
      />
      <div>
        <label
          htmlFor={`gfe-amount-${item.id}`}
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
            id={`gfe-amount-${item.id}`}
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

// ── Shared styles ─────────────────────────────────────────────────────────────

const cardTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "var(--text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 0,
};

const twoCol: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr",
  gap: "var(--space-4)",
};

const navRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginTop: "var(--space-8)",
};
