import React from "react";
import {
  useAppState,
  parseDraftToGfe,
  parseDraftToBill,
} from "./hooks/useAppState";
import { ProgressRail } from "./components/ProgressRail";
import { EligibilityGate } from "./components/EligibilityGate";
import { GfeForm } from "./components/GfeForm";
import { BillForm } from "./components/BillForm";
import { ResultsScreen } from "./components/ResultsScreen";

export default function App() {
  const app = useAppState();
  const { state } = app;

  return (
    <div>
      {/* Skip link — keyboard navigation (skill priority 1) */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "0 var(--space-6)",
        }}
      >
        <div style={container}>
          <div
            style={{
              padding: "var(--space-4) 0",
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-3)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                color: "var(--accent)",
              }}
            >
              BillCheck
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              No Surprises Act Bill Auditor
            </span>
          </div>
        </div>
      </header>

      {/* Progress rail */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={container}>
          <ProgressRail currentStep={state.step} />
        </div>
      </div>

      {/* Main content */}
      <main
        id="main-content"
        style={{ padding: "0 var(--space-6) var(--space-12)" }}
      >
        <div style={container}>
          {state.step === "eligibility" && (
            <EligibilityGate
              patient={state.patient}
              onUpdate={app.setPatient}
              onNext={() => app.setStep("gfe")}
            />
          )}
          {state.step === "gfe" && (
            <GfeForm
              gfeDraft={state.gfeDraft}
              onUpdateGfe={app.updateGfeDraft}
              onAddProvider={app.addProvider}
              onUpdateProvider={app.updateProvider}
              onRemoveProvider={app.removeProvider}
              onAddLineItem={app.addGfeLineItem}
              onUpdateLineItem={app.updateGfeLineItem}
              onRemoveLineItem={app.removeGfeLineItem}
              onBack={() => app.setStep("eligibility")}
              onNext={() => app.setStep("bill")}
            />
          )}
          {state.step === "bill" && (
            <BillForm
              billDraft={state.billDraft}
              gfeDraft={state.gfeDraft}
              onUpdateBill={app.updateBillDraft}
              onAddLineItem={app.addBillLineItem}
              onUpdateLineItem={app.updateBillLineItem}
              onRemoveLineItem={app.removeBillLineItem}
              onBack={() => app.setStep("gfe")}
              onRun={app.runAudit}
            />
          )}
          {state.step === "result" && state.result && (
            <ResultsScreen
              result={state.result}
              patientName={state.gfeDraft.patientName}
              gfe={parseDraftToGfe(state.gfeDraft, state.gfeDraft.patientName)}
              bill={parseDraftToBill(
                state.billDraft,
                state.gfeDraft,
                state.gfeDraft.patientName,
              )}
              onReset={app.reset}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const container: React.CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  paddingTop: "var(--space-10)",
};
