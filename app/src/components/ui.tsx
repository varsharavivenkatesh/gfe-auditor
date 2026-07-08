/**
 * Shared UI primitives.
 * Design system: 4/8pt spacing rhythm, 44px min touch targets,
 * semantic color tokens only, no emoji icons, WCAG 4.5:1 contrast.
 */
import React from "react";

// ---------------------------------------------------------------------------
// Button — min 44px height, cursor:pointer, disabled state, all variants
// ---------------------------------------------------------------------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    fontSize: size === "sm" ? 14 : 15,
    borderRadius: "var(--radius-sm)",
    // sm still hits 44px height for touch target compliance
    padding: size === "sm" ? "0 16px" : "0 24px",
    minHeight: "var(--touch-min)",
    transition: "background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast), opacity var(--duration-fast)",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "1.5px solid transparent",
    whiteSpace: "nowrap",
    touchAction: "manipulation",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: disabled ? "var(--text-muted)" : "var(--accent)",
      color: "#fff",
      borderColor: disabled ? "var(--text-muted)" : "var(--accent)",
    },
    secondary: {
      background: "transparent",
      color: disabled ? "var(--text-muted)" : "var(--accent)",
      borderColor: disabled ? "var(--text-muted)" : "var(--accent)",
    },
    ghost: {
      background: "transparent",
      color: "var(--text-secondary)",
      borderColor: "var(--border)",
    },
    danger: {
      background: "transparent",
      color: "var(--danger)",
      borderColor: "transparent",
      minHeight: "var(--touch-min)",
    },
  };

  return (
    <button
      disabled={disabled}
      aria-disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Input — 44px min height, 16px font (no iOS zoom), visible label required
// ---------------------------------------------------------------------------

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, style, ...rest }: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${inputId}-error`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}
      >
        {label}
      </label>
      {hint && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: -2, lineHeight: 1.4 }}>
          {hint}
        </span>
      )}
      <input
        id={inputId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        style={{
          padding: "0 var(--space-3)",
          borderRadius: "var(--radius-sm)",
          border: `1.5px solid ${error ? "var(--danger)" : "var(--border)"}`,
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: 16, // 16px prevents iOS auto-zoom
          minHeight: "var(--touch-min)",
          width: "100%",
          transition: "border-color var(--duration-fast)",
          cursor: "text",
          ...style,
        }}
        {...rest}
      />
      {error && (
        <span
          id={errorId}
          role="alert"
          style={{ fontSize: 12, color: "var(--danger)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="5.5" stroke="var(--danger)" />
            <path d="M6 3.5v3M6 8h.01" stroke="var(--danger)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select — 44px min height, visible label, cursor:pointer
// ---------------------------------------------------------------------------

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export function Select({ label, hint, id, children, style, ...rest }: SelectProps) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <label
        htmlFor={selectId}
        style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}
      >
        {label}
      </label>
      {hint && (
        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: -2 }}>
          {hint}
        </span>
      )}
      <select
        id={selectId}
        style={{
          padding: "0 var(--space-3)",
          borderRadius: "var(--radius-sm)",
          border: "1.5px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: 16,
          minHeight: "var(--touch-min)",
          width: "100%",
          cursor: "pointer",
          ...style,
        }}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoBanner — icon + text so color is never the only indicator
// ---------------------------------------------------------------------------

const BANNER_ICONS: Record<string, React.ReactNode> = {
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export function InfoBanner({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning" | "success";
}) {
  const colors = {
    info:    { bg: "var(--accent-light)",  border: "var(--accent)", text: "var(--accent-dark)" },
    warning: { bg: "var(--amber-light)",   border: "var(--amber)",  text: "#7C4A0A" },
    success: { bg: "var(--accent-light)",  border: "var(--accent)", text: "var(--accent-dark)" },
  }[variant];

  const role = variant === "warning" ? "alert" : undefined;

  return (
    <div
      role={role}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-3) var(--space-4)",
        fontSize: 14,
        color: colors.text,
        lineHeight: 1.6,
        display: "flex",
        gap: "var(--space-2)",
        alignItems: "flex-start",
      }}
    >
      {BANNER_ICONS[variant]}
      <span>{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHeading — h1 at page level (not h2) for correct heading hierarchy
// ---------------------------------------------------------------------------

export function SectionHeading({
  title,
  subtitle,
  as: Tag = "h1",
}: {
  title: string;
  subtitle?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div style={{ marginBottom: "var(--space-8)" }}>
      <Tag
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 400,
          color: "var(--text-primary)",
          lineHeight: 1.25,
          marginBottom: subtitle ? "var(--space-2)" : 0,
        }}
      >
        {title}
      </Tag>
      {subtitle && (
        <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

export function Divider({ label }: { label?: string }) {
  if (!label) {
    return (
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "var(--space-5) 0",
        }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        margin: "var(--space-5) 0",
      }}
    >
      <div style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// IconButton — for remove/close actions with accessible label
// ---------------------------------------------------------------------------

export function IconButton({
  label,
  onClick,
  style,
}: {
  label: string;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "var(--touch-min)",
        minHeight: "var(--touch-min)",
        background: "none",
        border: "none",
        color: "var(--text-muted)",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        fontSize: 20,
        lineHeight: 1,
        touchAction: "manipulation",
        transition: "color var(--duration-fast)",
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
