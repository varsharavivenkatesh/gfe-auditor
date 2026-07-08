/**
 * GeneratePacketButton — triggers PDF dispute packet generation in-browser.
 * Shows a loading state while pdf-lib assembles the document, then
 * auto-downloads it. No data ever leaves the device.
 */
import React, { useState } from "react";
import type { EligibilityResult, GoodFaithEstimate, ActualBill } from "../types/models";
import { generateDisputePacket, downloadPdf } from "../rules/generatePacket";

interface GeneratePacketButtonProps {
  gfe: GoodFaithEstimate;
  bill: ActualBill;
  result: EligibilityResult;
}

type Status = "idle" | "generating" | "done" | "error";

export function GeneratePacketButton({ gfe, bill, result }: GeneratePacketButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate() {
    setStatus("generating");
    setErrorMsg("");
    try {
      const bytes = await generateDisputePacket({ gfe, bill, result });
      const safeName = gfe.patientName
        ? `dispute-packet-${gfe.patientName.replace(/\s+/g, "-").toLowerCase()}.pdf`
        : "dispute-packet.pdf";
      downloadPdf(bytes, safeName);
      setStatus("done");
      // Reset after 4s so button is reusable
      setTimeout(() => setStatus("idle"), 4000);
    } catch (e) {
      console.error("PDF generation error:", e);
      setErrorMsg("Something went wrong generating the PDF. Please try again.");
      setStatus("error");
    }
  }

  const isGenerating = status === "generating";
  const isDone       = status === "done";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        aria-busy={isGenerating}
        aria-label={isGenerating ? "Generating your dispute packet PDF…" : "Download dispute packet PDF"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: 15,
          borderRadius: "var(--radius-sm)",
          padding: "0 24px",
          minHeight: "var(--touch-min)",
          border: "1.5px solid transparent",
          cursor: isGenerating ? "wait" : "pointer",
          touchAction: "manipulation",
          transition: "background 150ms, opacity 150ms",
          background: isDone ? "var(--accent-dark)" : "var(--accent)",
          color: "#fff",
          opacity: isGenerating ? 0.75 : 1,
        }}
      >
        {isGenerating ? (
          <>
            <SpinnerIcon />
            Generating packet…
          </>
        ) : isDone ? (
          <>
            <CheckIcon />
            Downloaded — generate again
          </>
        ) : (
          <>
            <DownloadIcon />
            Download dispute packet (PDF)
          </>
        )}
      </button>

      {status === "error" && (
        <p role="alert" style={{ fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="6" stroke="var(--danger)" strokeWidth="1.2"/>
            <path d="M6.5 3.5v3.5M6.5 9h.01" stroke="var(--danger)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {errorMsg}
        </p>
      )}

      {status === "idle" && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          4-page PDF generated in your browser — nothing is sent to any server.
          Includes the initiation notice, provider comparison, and submission checklist.
        </p>
      )}
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 2v8M4.5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 11.5h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2.5 7.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
