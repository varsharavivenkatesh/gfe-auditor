import { useState, useCallback } from "react";
import type {
  ActualBill,
  GoodFaithEstimate,
  PatientContext,
  Provider,
  LineItem,
  EligibilityResult,
} from "../types/models";
import { evaluateEligibility } from "../rules/eligibility";

export type Step = "eligibility" | "gfe" | "bill" | "result";

/** Minimal draft types for form state — amounts are strings until submitted. */
export interface DraftLineItem {
  id: string;
  providerId: string;
  description: string;
  amount: string; // string in the form, parsed to number on submit
}

export interface DraftProvider {
  id: string;
  name: string;
  role: string;
}

export interface AppState {
  step: Step;
  patient: PatientContext;
  gfeDraft: {
    patientName: string;
    dateIssued: string;
    dateScheduled: string;
    primaryServiceDescription: string;
    providers: DraftProvider[];
    lineItems: DraftLineItem[];
  };
  billDraft: {
    dateReceived: string;
    lineItems: DraftLineItem[];
  };
  result: EligibilityResult | null;
}

const defaultPatient: PatientContext = {
  billingStatus: "uninsured",
  toldProviderNoInsurance: true,
  careOnOrAfterJan2022: true,
};

const defaultState: AppState = {
  step: "eligibility",
  patient: defaultPatient,
  gfeDraft: {
    patientName: "",
    dateIssued: "",
    dateScheduled: "",
    primaryServiceDescription: "",
    providers: [{ id: "p1", name: "", role: "" }],
    lineItems: [{ id: "l1", providerId: "p1", description: "", amount: "" }],
  },
  billDraft: {
    dateReceived: "",
    lineItems: [{ id: "b1", providerId: "p1", description: "", amount: "" }],
  },
  result: null,
};

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseDraftToGfe(
  draft: AppState["gfeDraft"],
  patientName: string,
): GoodFaithEstimate {
  const providers: Provider[] = draft.providers.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role || undefined,
  }));
  const lineItems: LineItem[] = draft.lineItems.map((l) => ({
    id: l.id,
    providerId: l.providerId,
    description: l.description,
    amount: parseFloat(l.amount) || 0,
  }));
  return {
    patientName,
    patientDateOfBirth: "",
    primaryServiceDescription: draft.primaryServiceDescription,
    dateIssued: draft.dateIssued,
    dateScheduled: draft.dateScheduled,
    providers,
    lineItems,
  };
}

export function parseDraftToBill(
  draft: AppState["billDraft"],
  gfeDraft: AppState["gfeDraft"],
  patientName: string,
): ActualBill {
  const providers: Provider[] = gfeDraft.providers.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role || undefined,
  }));
  const lineItems: LineItem[] = draft.lineItems.map((l) => ({
    id: l.id,
    providerId: l.providerId,
    description: l.description,
    amount: parseFloat(l.amount) || 0,
  }));
  return {
    patientName,
    dateReceived: draft.dateReceived,
    providers,
    lineItems,
  };
}

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);

  const setStep = useCallback((step: Step) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const setPatient = useCallback((patient: PatientContext) => {
    setState((s) => ({ ...s, patient }));
  }, []);

  const updateGfeDraft = useCallback(
    (updates: Partial<AppState["gfeDraft"]>) => {
      setState((s) => ({ ...s, gfeDraft: { ...s.gfeDraft, ...updates } }));
    },
    [],
  );

  const updateBillDraft = useCallback(
    (updates: Partial<AppState["billDraft"]>) => {
      setState((s) => ({ ...s, billDraft: { ...s.billDraft, ...updates } }));
    },
    [],
  );

  // Providers are shared across GFE and bill (same providers, different amounts).
  const addProvider = useCallback(() => {
    const id = generateId("p");
    setState((s) => ({
      ...s,
      gfeDraft: {
        ...s.gfeDraft,
        providers: [...s.gfeDraft.providers, { id, name: "", role: "" }],
      },
    }));
  }, []);

  const updateProvider = useCallback(
    (id: string, updates: Partial<DraftProvider>) => {
      setState((s) => ({
        ...s,
        gfeDraft: {
          ...s.gfeDraft,
          providers: s.gfeDraft.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        },
      }));
    },
    [],
  );

  const removeProvider = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      gfeDraft: {
        ...s.gfeDraft,
        providers: s.gfeDraft.providers.filter((p) => p.id !== id),
        lineItems: s.gfeDraft.lineItems.filter((l) => l.providerId !== id),
      },
      billDraft: {
        ...s.billDraft,
        lineItems: s.billDraft.lineItems.filter((l) => l.providerId !== id),
      },
    }));
  }, []);

  const addGfeLineItem = useCallback((providerId: string) => {
    const id = generateId("l");
    setState((s) => ({
      ...s,
      gfeDraft: {
        ...s.gfeDraft,
        lineItems: [
          ...s.gfeDraft.lineItems,
          { id, providerId, description: "", amount: "" },
        ],
      },
    }));
  }, []);

  const updateGfeLineItem = useCallback(
    (id: string, updates: Partial<DraftLineItem>) => {
      setState((s) => ({
        ...s,
        gfeDraft: {
          ...s.gfeDraft,
          lineItems: s.gfeDraft.lineItems.map((l) =>
            l.id === id ? { ...l, ...updates } : l,
          ),
        },
      }));
    },
    [],
  );

  const removeGfeLineItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      gfeDraft: {
        ...s.gfeDraft,
        lineItems: s.gfeDraft.lineItems.filter((l) => l.id !== id),
      },
    }));
  }, []);

  const addBillLineItem = useCallback((providerId: string) => {
    const id = generateId("b");
    setState((s) => ({
      ...s,
      billDraft: {
        ...s.billDraft,
        lineItems: [
          ...s.billDraft.lineItems,
          { id, providerId, description: "", amount: "" },
        ],
      },
    }));
  }, []);

  const updateBillLineItem = useCallback(
    (id: string, updates: Partial<DraftLineItem>) => {
      setState((s) => ({
        ...s,
        billDraft: {
          ...s.billDraft,
          lineItems: s.billDraft.lineItems.map((l) =>
            l.id === id ? { ...l, ...updates } : l,
          ),
        },
      }));
    },
    [],
  );

  const removeBillLineItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      billDraft: {
        ...s.billDraft,
        lineItems: s.billDraft.lineItems.filter((l) => l.id !== id),
      },
    }));
  }, []);

  const runAudit = useCallback(() => {
    const { gfeDraft, billDraft, patient } = state;
    const gfe = parseDraftToGfe(gfeDraft, gfeDraft.patientName);
    const bill = parseDraftToBill(billDraft, gfeDraft, gfeDraft.patientName);
    const today = new Date().toISOString().slice(0, 10);
    const result = evaluateEligibility(gfe, bill, patient, today);
    setState((s) => ({ ...s, result, step: "result" }));
  }, [state]);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  return {
    state,
    setStep,
    setPatient,
    updateGfeDraft,
    updateBillDraft,
    addProvider,
    updateProvider,
    removeProvider,
    addGfeLineItem,
    updateGfeLineItem,
    removeGfeLineItem,
    addBillLineItem,
    updateBillLineItem,
    removeBillLineItem,
    runAudit,
    reset,
  };
}
