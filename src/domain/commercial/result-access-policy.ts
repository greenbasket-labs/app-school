import type { ResultAccessSettings } from "./plans";

export type ResultAccessDecision =
  | { allowed: true; reason: "FREE" | "ENTITLED" }
  | { allowed: false; reason: "SCHOOL_UNAUTHORIZED" | "STUDENT_UNAUTHORIZED" | "RESULT_NOT_PUBLISHED" | "PAYMENT_REQUIRED" };

export type ResultAccessAuthorizationInput = {
  schoolAuthorized: boolean;
  studentAuthorized: boolean;
  resultPublished: boolean;
  settings: ResultAccessSettings;
  entitled: boolean;
};

/**
 * Result access is deliberately evaluated after identity, school context and
 * student relationship have already been established. Payment is an access
 * condition, not a replacement for authorization.
 */
export function evaluateResultAccess(input: ResultAccessAuthorizationInput): ResultAccessDecision {
  if (!input.schoolAuthorized) return { allowed: false, reason: "SCHOOL_UNAUTHORIZED" };
  if (!input.studentAuthorized) return { allowed: false, reason: "STUDENT_UNAUTHORIZED" };
  if (!input.resultPublished) return { allowed: false, reason: "RESULT_NOT_PUBLISHED" };

  if (!input.settings.enabled || input.settings.amountNaira === 0) {
    return { allowed: true, reason: "FREE" };
  }

  if (input.entitled) return { allowed: true, reason: "ENTITLED" };
  return { allowed: false, reason: "PAYMENT_REQUIRED" };
}
