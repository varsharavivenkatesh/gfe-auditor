import React from "react";
import type { Step } from "../hooks/useAppState";

const STEPS: { key: Step; label: string }[] = [
  { key: "eligibility", label: "Am I eligible?" },
  { key: "gfe",         label: "My estimate" },
  { key: "bill",        label: "My bill" },
  { key: "result",      label: "Results" },
];

interface ProgressRailProps { currentStep: Step; }

export function ProgressRail({ currentStep }: ProgressRailProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Progress steps" style={s.nav}>
      <ol style={s.rail} role="list">
        {STEPS.map((step, i) => {
          const isDone    = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <React.Fragment key={step.key}>
              <li style={s.stepWrapper}>
                <div
                  style={{
                    ...s.dot,
                    ...(isDone    ? s.dotDone    : {}),
                    ...(isCurrent ? s.dotCurrent : {}),
                  }}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${isDone ? "Completed: " : isCurrent ? "Current: " : ""}${step.label}`}
                >
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span
                      style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: isCurrent ? "var(--accent)" : "var(--border)",
                        display: "block",
                      }}
                    />
                  )}
                </div>
                <span style={{
                  ...s.label,
                  ...(isCurrent ? s.labelCurrent : {}),
                  ...(isDone    ? s.labelDone    : {}),
                }}>
                  {step.label}
                </span>
              </li>
              {i < STEPS.length - 1 && (
                <li aria-hidden="true" style={{
                  ...s.connector,
                  ...(isDone ? s.connectorDone : {}),
                }} />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

const s: Record<string, React.CSSProperties> = {
  nav: {
    padding: "var(--space-6) 0 var(--space-5)",
    borderBottom: "1px solid var(--border)",
    marginBottom: "var(--space-10)",
  },
  rail: {
    display: "flex",
    alignItems: "center",
    maxWidth: 560,
    margin: "0 auto",
    listStyle: "none",
    padding: 0,
  },
  stepWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-2)",
    flexShrink: 0,
  },
  dot: {
    width: 28, height: 28,
    borderRadius: "50%",
    background: "var(--bg)",
    border: "2px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background var(--duration-fast), border-color var(--duration-fast)",
  },
  dotDone:    { background: "var(--accent)", borderColor: "var(--accent)" },
  dotCurrent: { background: "var(--surface)", borderColor: "var(--accent)" },
  connector: {
    flex: 1,
    height: 2,
    background: "var(--border)",
    margin: "0 var(--space-1)",
    marginBottom: 26,
    transition: "background var(--duration-fast)",
  },
  connectorDone: { background: "var(--accent)" },
  label: {
    fontSize: 11, fontWeight: 500,
    color: "var(--text-muted)",
    textAlign: "center",
    lineHeight: 1.3,
    maxWidth: 72,
    whiteSpace: "nowrap",
  },
  labelCurrent: { color: "var(--accent)", fontWeight: 700 },
  labelDone:    { color: "var(--text-secondary)" },
};
