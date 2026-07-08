/**
 * Dispute Packet Generator — Days 10–13
 *
 * Generates a ready-to-file PDF dispute packet for the Patient-Provider
 * Dispute Resolution (PPDR) process under 45 CFR §149.620.
 *
 * Packet structure:
 *   Page 1 — Cover page & eligibility summary
 *   Page 2 — Per-provider comparison table (the legal calculation)
 *   Page 3 — PPDR Initiation Notice (pre-filled, mirrors CMS form fields)
 *   Page 4 — Submission checklist & next steps
 *
 * Runs entirely in the browser — no server, no data sent anywhere.
 */

import {
  PDFDocument,
  PDFPage,
  PDFFont,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import type { EligibilityResult, GoodFaithEstimate, ActualBill } from "../types/models";
import { PPDR_FILING_FEE_DOLLARS } from "./eligibility";

// ---------------------------------------------------------------------------
// Design constants
// ---------------------------------------------------------------------------

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 56;
const COL_W  = PAGE_W - MARGIN * 2;

const C = {
  accent:     rgb(0.165, 0.482, 0.435),  // #2A7B6F
  accentDark: rgb(0.122, 0.361, 0.329),  // #1F5C54
  danger:     rgb(0.722, 0.196, 0.145),  // #B83225
  amber:      rgb(0.753, 0.439, 0.063),  // #C07010
  text:       rgb(0.106, 0.165, 0.231),  // #1B2A3B
  secondary:  rgb(0.290, 0.361, 0.420),  // #4A5C6B
  muted:      rgb(0.478, 0.561, 0.627),  // #7A8FA0
  border:     rgb(0.886, 0.867, 0.839),  // #E2DDD6
  bg:         rgb(0.973, 0.969, 0.957),  // #F8F7F4
  white:      rgb(1, 1, 1),
} as const;

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

interface DrawCtx {
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: RGB) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: RGB, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function text(
  ctx: DrawCtx,
  str: string,
  x: number,
  y: number,
  opts: {
    font?: "regular" | "bold" | "italic";
    size?: number;
    color?: RGB;
    maxWidth?: number;
  } = {}
): number {
  const font     = opts.font === "bold" ? ctx.bold : opts.font === "italic" ? ctx.italic : ctx.regular;
  const size     = opts.size ?? 10;
  const color    = opts.color ?? C.text;
  const maxWidth = opts.maxWidth ?? COL_W;

  // Word-wrap
  const words = str.split(" ");
  let line = "";
  let curY = y;
  const lineH = size * 1.45;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    const w    = font.widthOfTextAtSize(test, size);
    if (w > maxWidth && line) {
      ctx.page.drawText(line, { x, y: curY, size, font, color });
      curY -= lineH;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.page.drawText(line, { x, y: curY, size, font, color });
    curY -= lineH;
  }
  return curY; // returns new Y after the text block
}

function textRight(ctx: DrawCtx, str: string, rightEdge: number, y: number, size = 10, color: RGB = C.text) {
  const font  = ctx.regular;
  const w     = font.widthOfTextAtSize(str, size);
  ctx.page.drawText(str, { x: rightEdge - w, y, size, font, color });
}

function sectionHeader(ctx: DrawCtx, label: string, y: number): number {
  drawRect(ctx.page, MARGIN, y - 2, COL_W, 18, C.bg);
  drawLine(ctx.page, MARGIN, y + 16, MARGIN + COL_W, y + 16, C.border);
  ctx.page.drawText(label.toUpperCase(), {
    x: MARGIN + 6, y: y + 4,
    size: 8, font: ctx.bold, color: C.muted,
  });
  return y - 14;
}

function labelValue(ctx: DrawCtx, label: string, value: string, x: number, y: number, colW = COL_W): number {
  ctx.page.drawText(label, { x, y, size: 8, font: ctx.bold, color: C.secondary });
  return text(ctx, value || "—", x, y - 12, { size: 10, maxWidth: colW });
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function pageFooter(ctx: DrawCtx, pageNum: number, totalPages: number) {
  const y = 28;
  drawLine(ctx.page, MARGIN, y + 14, PAGE_W - MARGIN, y + 14, C.border);
  ctx.page.drawText("BillCheck — No Surprises Act Bill Auditor | Generated under 45 CFR §149.620", {
    x: MARGIN, y, size: 7, font: ctx.regular, color: C.muted,
  });
  textRight(ctx, `Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y, 7, C.muted);
}

// ---------------------------------------------------------------------------
// Page 1 — Cover page & eligibility summary
// ---------------------------------------------------------------------------

function buildCoverPage(
  ctx: DrawCtx,
  gfe: GoodFaithEstimate,
  bill: ActualBill,
  result: EligibilityResult,
  generatedDate: string
) {
  const { page } = ctx;

  // Header band
  drawRect(page, 0, PAGE_H - 88, PAGE_W, 88, C.accent);
  page.drawText("DISPUTE PACKET", {
    x: MARGIN, y: PAGE_H - 36,
    size: 9, font: ctx.bold, color: rgb(1,1,1,),
  });
  page.drawText("No Surprises Act — Patient-Provider Dispute Resolution", {
    x: MARGIN, y: PAGE_H - 52,
    size: 14, font: ctx.bold, color: C.white,
  });
  page.drawText("45 CFR §149.620  |  Effective January 1, 2022", {
    x: MARGIN, y: PAGE_H - 68,
    size: 8, font: ctx.regular, color: rgb(0.8, 0.93, 0.90),
  });

  // Verdict badge
  const eligible = result.eligible;
  const badgeColor = eligible ? C.accent : C.danger;
  const badgeLabel = eligible
    ? "ELIGIBLE TO DISPUTE"
    : "NOT ELIGIBLE — SEE PAGE 2";
  drawRect(page, MARGIN, PAGE_H - 130, COL_W, 30, badgeColor);
  const badgeW = ctx.bold.widthOfTextAtSize(badgeLabel, 11);
  page.drawText(badgeLabel, {
    x: MARGIN + (COL_W - badgeW) / 2,
    y: PAGE_H - 119,
    size: 11, font: ctx.bold, color: C.white,
  });

  let y = PAGE_H - 160;

  // Patient & visit overview
  y = sectionHeader(ctx, "Patient & visit overview", y);
  y -= 6;

  // Two-column layout
  const half = (COL_W - 16) / 2;
  const col2 = MARGIN + half + 16;

  y = labelValue(ctx, "Patient Name", gfe.patientName, MARGIN, y, half) - 10;
  labelValue(ctx, "Primary Service", gfe.primaryServiceDescription, col2, y + 22, half);
  labelValue(ctx, "GFE Date Issued", formatDate(gfe.dateIssued), MARGIN, y, half);
  y = labelValue(ctx, "Bill Date Received", formatDate(bill.dateReceived), col2, y, half) - 10;
  labelValue(ctx, "Scheduled Appointment", formatDate(gfe.dateScheduled), MARGIN, y, half);
  y -= 24;

  // Filing window
  y = sectionHeader(ctx, "Filing deadline", y) - 6;

  if (eligible && result.filingDeadline) {
    const days = result.daysRemainingToFile ?? 0;
    const urgentColor = days <= 14 ? C.danger : C.accent;
    drawRect(page, MARGIN, y - 26, COL_W, 38, days <= 14 ? rgb(0.99, 0.93, 0.91) : rgb(0.91, 0.96, 0.95));
    drawRect(page, MARGIN, y - 26, 4, 38, urgentColor);
    page.drawText(`Filing deadline: ${formatDate(result.filingDeadline)}`, {
      x: MARGIN + 14, y: y + 4,
      size: 11, font: ctx.bold, color: urgentColor,
    });
    page.drawText(`${days} calendar days remaining  |  120-day window from bill date (45 CFR §149.620(b)(1))`, {
      x: MARGIN + 14, y: y - 10,
      size: 8, font: ctx.regular, color: C.secondary,
    });
    y -= 40;
  } else if (!eligible) {
    y = text(ctx, "This bill does not currently meet PPDR eligibility criteria. See page 2 for the specific reasons.", MARGIN, y, { size: 10, color: C.danger }) - 8;
  }

  // Provider summary table (compact)
  y = sectionHeader(ctx, "Per-provider overage summary", y) - 6;

  const colWidths = [220, 90, 90, 100];
  const colX = [MARGIN, MARGIN + 220, MARGIN + 310, MARGIN + 400];
  const headers = ["Provider", "GFE Estimate", "Amount Billed", "Difference"];

  // Table header row
  drawRect(page, MARGIN, y - 4, COL_W, 18, C.accentDark);
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: colX[i] + 4, y: y + 2,
      size: 8, font: ctx.bold, color: C.white,
    });
  });
  y -= 6;

  for (const c of result.providerComparisons) {
    const rowH = 22;
    y -= rowH;
    const rowBg = c.meetsThreshold ? rgb(0.99, 0.93, 0.91) : C.white;
    drawRect(page, MARGIN, y - 2, COL_W, rowH, rowBg);
    drawLine(page, MARGIN, y - 2, PAGE_W - MARGIN, y - 2, C.border);

    page.drawText(c.provider.name, { x: colX[0] + 4, y: y + 7, size: 9, font: ctx.bold, color: C.text });
    if (c.provider.role) {
      page.drawText(c.provider.role, { x: colX[0] + 4, y: y - 2, size: 7, font: ctx.regular, color: C.muted });
    }

    page.drawText(formatMoney(c.estimatedTotal), { x: colX[1] + 4, y: y + 5, size: 9, font: ctx.regular, color: C.text });
    page.drawText(formatMoney(c.billedTotal),    { x: colX[2] + 4, y: y + 5, size: 9, font: ctx.regular, color: C.text });

    const diffColor = c.meetsThreshold ? C.danger : c.overage > 0 ? C.amber : C.accent;
    const diffLabel = `${c.overage >= 0 ? "+" : ""}${formatMoney(c.overage)}${c.meetsThreshold ? " ✓ DISPUTE" : ""}`;
    page.drawText(diffLabel, { x: colX[3] + 4, y: y + 5, size: 9, font: ctx.bold, color: diffColor });
  }

  y -= 14;
  drawLine(page, MARGIN, y, PAGE_W - MARGIN, y, C.border);
  y -= 10;
  text(ctx, "Note: The $400 threshold is evaluated per provider, not as a combined total. Source: 45 CFR §149.620(a)(3).", MARGIN, y, { size: 7, color: C.muted });

  pageFooter(ctx, 1, 4);
}

// ---------------------------------------------------------------------------
// Page 2 — Full per-provider comparison with legal citations
// ---------------------------------------------------------------------------

function buildComparisonPage(ctx: DrawCtx, result: EligibilityResult) {
  const { page } = ctx;
  let y = PAGE_H - MARGIN;

  page.drawText("Per-Provider Comparison — Legal Calculation", {
    x: MARGIN, y,
    size: 16, font: ctx.bold, color: C.accentDark,
  });
  y -= 10;
  drawLine(page, MARGIN, y, PAGE_W - MARGIN, y, C.accent, 1.5);
  y -= 18;

  text(ctx, "Federal rules require the $400 dispute threshold to be evaluated separately for each provider or facility — not as a combined total across the entire bill. The comparison below reflects 45 CFR §149.620(a)(3) exactly.", MARGIN, y, { size: 9, color: C.secondary });
  y -= 36;

  for (const c of result.providerComparisons) {
    const blockH = 110;
    if (y - blockH < MARGIN + 40) break; // guard — both comparisons should fit on Letter

    const eligible = c.meetsThreshold;
    const borderColor = eligible ? C.danger : C.border;

    // Provider card
    drawRect(page, MARGIN, y - blockH, COL_W, blockH, eligible ? rgb(0.99, 0.93, 0.91) : C.bg);
    drawRect(page, MARGIN, y - blockH, 3, blockH, borderColor);

    // Provider name + role
    page.drawText(c.provider.name, { x: MARGIN + 14, y: y - 14, size: 12, font: ctx.bold, color: C.text });
    if (c.provider.role) {
      page.drawText(c.provider.role, { x: MARGIN + 14, y: y - 26, size: 8, font: ctx.regular, color: C.muted });
    }

    // Eligibility badge
    const badge = eligible ? "ELIGIBLE TO DISPUTE" : c.overage > 0 ? `BELOW $${400} THRESHOLD` : "NO OVERAGE";
    const badgeW = ctx.bold.widthOfTextAtSize(badge, 8) + 12;
    drawRect(page, PAGE_W - MARGIN - badgeW - 4, y - 22, badgeW, 16, eligible ? C.danger : c.overage > 0 ? C.amber : C.accent);
    page.drawText(badge, { x: PAGE_W - MARGIN - badgeW, y: y - 16, size: 8, font: ctx.bold, color: C.white });

    // Three amount columns
    const thirdW = COL_W / 3;
    const amounts = [
      { label: "GFE Estimate", value: formatMoney(c.estimatedTotal), color: C.text },
      { label: "Amount Billed", value: formatMoney(c.billedTotal), color: C.text },
      { label: "Difference (Overage)", value: `${c.overage >= 0 ? "+" : ""}${formatMoney(c.overage)}`, color: eligible ? C.danger : c.overage > 0 ? C.amber : C.accent },
    ];

    amounts.forEach(({ label, value, color }, i) => {
      const ax = MARGIN + 14 + i * thirdW;
      page.drawText(label, { x: ax, y: y - 44, size: 7, font: ctx.bold, color: C.muted });
      page.drawText(value, { x: ax, y: y - 58, size: 16, font: ctx.bold, color });
    });

    // Legal basis line
    const legalY = y - blockH + 14;
    drawLine(page, MARGIN + 10, legalY + 8, PAGE_W - MARGIN - 10, legalY + 8, C.border, 0.3);
    page.drawText(
      eligible
        ? `Overage of ${formatMoney(c.overage)} meets or exceeds the $400 threshold. Patient may initiate PPDR per 45 CFR §149.620(a)(3).`
        : `Overage of ${formatMoney(c.overage)} does not meet the $400 per-provider threshold required by 45 CFR §149.620(a)(3).`,
      { x: MARGIN + 14, y: legalY, size: 7.5, font: ctx.italic, color: eligible ? C.danger : C.muted }
    );

    y -= blockH + 14;
  }

  // Ineligibility reasons (if any)
  if (!result.eligible && result.reasons.length > 0) {
    y -= 10;
    y = sectionHeader(ctx, "Ineligibility reasons", y) - 8;
    for (const reason of result.reasons) {
      page.drawText("•", { x: MARGIN, y, size: 10, font: ctx.bold, color: C.danger });
      y = text(ctx, reason, MARGIN + 12, y, { size: 9, color: C.text, maxWidth: COL_W - 12 }) - 6;
    }
  }

  pageFooter(ctx, 2, 4);
}

// ---------------------------------------------------------------------------
// Page 3 — PPDR Initiation Notice (mirrors CMS form fields)
// ---------------------------------------------------------------------------

function buildInitiationPage(
  ctx: DrawCtx,
  gfe: GoodFaithEstimate,
  bill: ActualBill,
  result: EligibilityResult
) {
  const { page } = ctx;
  let y = PAGE_H - MARGIN;

  page.drawText("Patient-Provider Dispute Resolution — Initiation Notice", {
    x: MARGIN, y, size: 15, font: ctx.bold, color: C.accentDark,
  });
  y -= 8;
  drawLine(page, MARGIN, y, PAGE_W - MARGIN, y, C.accent, 1.5);
  y -= 12;
  y = text(ctx, "This document pre-fills the initiation notice based on your GFE and bill data. Submit via the federal PPDR portal at cms.gov/nosurprises or by mail to the contracted reviewer. Review all fields before submitting.", MARGIN, y, { size: 8.5, color: C.secondary }) - 14;

  // Section A — Patient information
  y = sectionHeader(ctx, "Section A — Patient information", y) - 8;

  const half = (COL_W - 16) / 2;
  const col2x = MARGIN + half + 16;

  y = labelValue(ctx, "Patient Full Name", gfe.patientName, MARGIN, y, half) - 8;
  labelValue(ctx, "Date of Birth", gfe.patientDateOfBirth ? formatDate(gfe.patientDateOfBirth) : "— (add from GFE)", col2x, y + 20, half);
  y -= 4;

  // Section B — Service information
  y = sectionHeader(ctx, "Section B — Service information", y) - 8;

  y = labelValue(ctx, "Description of Primary Item or Service", gfe.primaryServiceDescription, MARGIN, y, COL_W) - 8;
  labelValue(ctx, "Date GFE Was Issued", formatDate(gfe.dateIssued), MARGIN, y, half);
  y = labelValue(ctx, "Date of Scheduled Service", formatDate(gfe.dateScheduled), col2x, y, half) - 8;

  // Section C — Disputed providers
  y = sectionHeader(ctx, "Section C — Disputed provider(s)", y) - 8;
  y = text(ctx, "List only providers whose billed amount exceeded their GFE amount by $400 or more.", MARGIN, y, { size: 8, color: C.secondary }) - 10;

  for (const c of result.eligibleProviders) {
    drawRect(page, MARGIN, y - 52, COL_W, 60, C.bg);
    drawRect(page, MARGIN, y - 52, 2, 60, C.accent);
    page.drawText(c.provider.name, { x: MARGIN + 10, y: y - 8, size: 10, font: ctx.bold, color: C.text });
    if (c.provider.role) {
      page.drawText(`Type: ${c.provider.role}`, { x: MARGIN + 10, y: y - 20, size: 8, font: ctx.regular, color: C.muted });
    }
    page.drawText(`GFE estimated: ${formatMoney(c.estimatedTotal)}`, { x: MARGIN + 10, y: y - 34, size: 8.5, font: ctx.regular, color: C.text });
    page.drawText(`Billed amount: ${formatMoney(c.billedTotal)}`, { x: col2x, y: y - 34, size: 8.5, font: ctx.regular, color: C.text });
    page.drawText(`Overage: ${formatMoney(c.overage)}  (threshold: $400.00)`, { x: MARGIN + 10, y: y - 46, size: 8.5, font: ctx.bold, color: C.danger });
    y -= 68;
  }

  // Section D — Bill information
  y = sectionHeader(ctx, "Section D — Bill information", y) - 8;
  labelValue(ctx, "Date Bill Was Received", formatDate(bill.dateReceived), MARGIN, y, half);
  if (result.filingDeadline) {
    labelValue(ctx, "Filing Deadline (120 days from bill receipt)", formatDate(result.filingDeadline), col2x, y, half);
  }
  y -= 36;

  // Section E — Filing fee acknowledgment
  y = sectionHeader(ctx, "Section E — Filing fee", y) - 8;
  y = text(ctx, `A $${PPDR_FILING_FEE_DOLLARS} non-refundable administrative fee is required at time of submission. If the dispute is decided in your favor, the $${PPDR_FILING_FEE_DOLLARS} will be deducted from the amount you owe your provider. Accepted payment: credit card, PayPal, or Venmo (online); money order or cashier's check (mail). Source: CMS PPDR Consumer Page.`, MARGIN, y, { size: 8.5, color: C.text }) - 12;

  // Section F — Signature block
  y = sectionHeader(ctx, "Section F — Patient signature", y) - 8;
  text(ctx, "By submitting this notice, I certify that the information above is accurate and complete to the best of my knowledge, and that I meet the eligibility criteria for the patient-provider dispute resolution process under 45 CFR §149.620.", MARGIN, y, { size: 8.5, color: C.text });
  y -= 48;

  drawLine(page, MARGIN, y, MARGIN + 220, y, C.text, 0.5);
  drawLine(page, MARGIN + 260, y, MARGIN + 420, y, C.text, 0.5);
  page.drawText("Patient Signature", { x: MARGIN, y: y - 12, size: 7.5, font: ctx.regular, color: C.muted });
  page.drawText("Date", { x: MARGIN + 260, y: y - 12, size: 7.5, font: ctx.regular, color: C.muted });

  pageFooter(ctx, 3, 4);
}

// ---------------------------------------------------------------------------
// Page 4 — Submission checklist & next steps
// ---------------------------------------------------------------------------

function buildChecklistPage(ctx: DrawCtx, result: EligibilityResult) {
  const { page } = ctx;
  let y = PAGE_H - MARGIN;

  page.drawText("Submission Checklist & Next Steps", {
    x: MARGIN, y, size: 15, font: ctx.bold, color: C.accentDark,
  });
  y -= 8;
  drawLine(page, MARGIN, y, PAGE_W - MARGIN, y, C.accent, 1.5);
  y -= 20;

  // Checklist
  y = sectionHeader(ctx, "Before you submit — gather these documents", y) - 10;

  const checkItems = [
    "This initiation notice (page 3), signed and dated",
    "A copy of your original Good Faith Estimate",
    "A copy of the actual bill you received (showing the higher charges)",
    `Payment of $${PPDR_FILING_FEE_DOLLARS} filing fee (credit card/PayPal/Venmo online, or money order/cashier's check by mail)`,
    "Any written communication from your provider about the bill (optional but helpful)",
  ];

  for (const item of checkItems) {
    // Checkbox square
    drawRect(page, MARGIN, y - 2, 11, 11, C.white);
    drawRect(page, MARGIN, y - 2, 11, 11, C.border);
    page.drawLine({ start: { x: MARGIN, y: y - 2 }, end: { x: MARGIN + 11, y: y - 2 }, thickness: 0.5, color: C.border });
    page.drawLine({ start: { x: MARGIN, y: y + 9 }, end: { x: MARGIN + 11, y: y + 9 }, thickness: 0.5, color: C.border });
    y = text(ctx, item, MARGIN + 18, y + 2, { size: 9.5, maxWidth: COL_W - 18 }) - 8;
  }

  y -= 10;

  // How to submit
  y = sectionHeader(ctx, "How to submit", y) - 10;

  const submitSteps = [
    {
      n: "1",
      title: "Online (recommended)",
      body: "Submit at the federal PPDR portal: cms.gov/nosurprises/consumers/disputing-a-bill. Pay the $25 fee by credit card, PayPal, or Venmo. You'll receive a confirmation number — save it.",
    },
    {
      n: "2",
      title: "By mail (fallback)",
      body: "Mail your signed initiation notice, copies of your GFE and bill, and a money order or cashier's check for $25 (payable to C2C Innovative Solutions) to the address listed on the CMS PPDR consumer page.",
    },
    {
      n: "3",
      title: "Deadline",
      body: result.filingDeadline
        ? `You must file by ${formatDate(result.filingDeadline)} — 120 calendar days from your bill date. Filing late forfeits your right to dispute under this process.`
        : "File within 120 calendar days of the date on your bill. Filing late forfeits your right to dispute under this process.",
    },
  ];

  for (const step of submitSteps) {
    drawRect(page, MARGIN, y - 42, 22, 22, C.accentDark);
    const nW = ctx.bold.widthOfTextAtSize(step.n, 11);
    page.drawText(step.n, { x: MARGIN + (22 - nW) / 2, y: y - 32, size: 11, font: ctx.bold, color: C.white });
    page.drawText(step.title, { x: MARGIN + 30, y: y - 14, size: 10, font: ctx.bold, color: C.text });
    y = text(ctx, step.body, MARGIN + 30, y - 26, { size: 9, maxWidth: COL_W - 30, color: C.secondary }) - 14;
  }

  // Protections during dispute
  y = sectionHeader(ctx, "Your protections while the dispute is active", y) - 10;
  const protections = [
    "Your provider cannot send this bill to collections or threaten to do so",
    "If collections have already started, they must be paused",
    "Your provider cannot charge late fees on this amount",
    "Your provider cannot take retaliatory action against you for filing",
  ];
  for (const p of protections) {
    page.drawText("•", { x: MARGIN, y, size: 11, font: ctx.bold, color: C.accent });
    y = text(ctx, p, MARGIN + 12, y, { size: 9, maxWidth: COL_W - 12, color: C.text }) - 6;
  }

  y -= 10;

  // Disclaimer
  drawRect(page, MARGIN, y - 36, COL_W, 44, C.bg);
  text(ctx, "This packet was generated by BillCheck and is based on the information you entered. It is not legal advice. All legal citations reference the No Surprises Act implementing regulations at 45 CFR §149.610–620. For complex situations, contact the CMS No Surprises Help Desk at 1-800-985-3059.", MARGIN + 8, y - 4, { size: 7.5, color: C.secondary, maxWidth: COL_W - 16 });

  pageFooter(ctx, 4, 4);
}

// ---------------------------------------------------------------------------
// Main export — assembles all pages
// ---------------------------------------------------------------------------

export interface PacketInput {
  gfe: GoodFaithEstimate;
  bill: ActualBill;
  result: EligibilityResult;
}

export async function generateDisputePacket(input: PacketInput): Promise<Uint8Array> {
  const { gfe, bill, result } = input;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("PPDR Dispute Packet — No Surprises Act");
  pdfDoc.setSubject("Patient-Provider Dispute Resolution Initiation");
  pdfDoc.setCreator("BillCheck — No Surprises Act Bill Auditor");

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  function addPage(): DrawCtx {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    return { page, regular, bold, italic };
  }

  buildCoverPage(addPage(), gfe, bill, result, generatedDate);
  buildComparisonPage(addPage(), result);
  buildInitiationPage(addPage(), gfe, bill, result);
  buildChecklistPage(addPage(), result);

  return pdfDoc.save();
}

/**
 * Triggers a browser download of the generated PDF.
 * Uses a blob URL — no data ever leaves the device.
 */
export function downloadPdf(bytes: Uint8Array, filename = "dispute-packet.pdf") {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
