export type CommercialPlanCode = "FREE" | "BASIC" | "STARTER" | "PRO" | "PREMIUM" | "CUSTOM";

export type BillingPeriod = "MONTHLY" | "ANNUAL";

export type CommercialPlan = {
  code: CommercialPlanCode;
  name: string;
  monthlyPriceNaira: number | null;
  resultSchoolSharePercent: number;
  resultAppSchoolSharePercent: number;
  description: string;
};

/**
 * Central product configuration. Prices are deliberately kept here rather
 * than scattered through UI or payment code so commercial terms can change
 * without rewriting business logic.
 */
export const COMMERCIAL_PLANS: Record<CommercialPlanCode, CommercialPlan> = {
  FREE: {
    code: "FREE",
    name: "Free",
    monthlyPriceNaira: 0,
    resultSchoolSharePercent: 0,
    resultAppSchoolSharePercent: 100,
    description: "Start with core App-School workflows within the free limits.",
  },
  BASIC: {
    code: "BASIC",
    name: "Basic",
    monthlyPriceNaira: 5_000,
    resultSchoolSharePercent: 25,
    resultAppSchoolSharePercent: 75,
    description: "For small schools moving beyond the free limits.",
  },
  STARTER: {
    code: "STARTER",
    name: "Starter",
    monthlyPriceNaira: 10_000,
    resultSchoolSharePercent: 50,
    resultAppSchoolSharePercent: 50,
    description: "For growing schools with broader operational needs.",
  },
  PRO: {
    code: "PRO",
    name: "Pro",
    monthlyPriceNaira: 20_000,
    resultSchoolSharePercent: 75,
    resultAppSchoolSharePercent: 25,
    description: "For established schools using advanced workflows.",
  },
  PREMIUM: {
    code: "PREMIUM",
    name: "Premium",
    monthlyPriceNaira: 35_000,
    resultSchoolSharePercent: 100,
    resultAppSchoolSharePercent: 0,
    description: "For advanced or customized school requirements.",
  },
  CUSTOM: {
    code: "CUSTOM",
    name: "Custom",
    monthlyPriceNaira: null,
    resultSchoolSharePercent: 100,
    resultAppSchoolSharePercent: 0,
    description: "Negotiated commercial terms for larger or specialized deployments.",
  },
};

export type ResultRevenueAllocation = {
  grossAmount: number;
  schoolShare: number;
  appSchoolShare: number;
};

export function getCommercialPlan(code: CommercialPlanCode): CommercialPlan {
  return COMMERCIAL_PLANS[code];
}

export function allocateResultRevenue(
  amount: number,
  planCode: CommercialPlanCode,
): ResultRevenueAllocation {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Result access amount must be a non-negative finite number.");
  }

  const plan = getCommercialPlan(planCode);
  const schoolShare = Number(((amount * plan.resultSchoolSharePercent) / 100).toFixed(2));
  return {
    grossAmount: amount,
    schoolShare,
    appSchoolShare: Number((amount - schoolShare).toFixed(2)),
  };
}

export type ResultAccessSettings = {
  enabled: boolean;
  amountNaira: number;
};

export function normalizeResultAccessSettings(
  input: ResultAccessSettings,
): ResultAccessSettings {
  if (!Number.isFinite(input.amountNaira) || input.amountNaira < 0) {
    throw new Error("Result access amount must be a non-negative finite number.");
  }

  if (input.amountNaira === 0) {
    return { enabled: false, amountNaira: 0 };
  }

  return {
    enabled: Boolean(input.enabled),
    amountNaira: Number(input.amountNaira.toFixed(2)),
  };
}
