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

export type ResultPaymentProvider = "PAYSTACK" | "FLUTTERWAVE" | "MONNIFY";

export type ResultPaymentAttemptInput = {
  schoolId: string;
  studentId: string;
  academicSessionId: string;
  academicTermId: string;
  amountNaira: number;
  provider: ResultPaymentProvider;
  idempotencyKey: string;
};

export type ResultPaymentAttempt = ResultPaymentAttemptInput & {
  currency: "NGN";
  status: "PENDING";
};

function requireId(value: string, name: string): string {
  if (!value.trim()) throw new Error(`${name} is required.`);
  return value.trim();
}

export function createResultPaymentAttempt(input: ResultPaymentAttemptInput): ResultPaymentAttempt {
  const schoolId = requireId(input.schoolId, "schoolId");
  const studentId = requireId(input.studentId, "studentId");
  const academicSessionId = requireId(input.academicSessionId, "academicSessionId");
  const academicTermId = requireId(input.academicTermId, "academicTermId");
  const idempotencyKey = requireId(input.idempotencyKey, "idempotencyKey");

  if (!Number.isFinite(input.amountNaira) || input.amountNaira <= 0) {
    throw new Error("Result payment amount must be a positive finite number.");
  }

  return {
    schoolId,
    studentId,
    academicSessionId,
    academicTermId,
    amountNaira: Number(input.amountNaira.toFixed(2)),
    provider: input.provider,
    idempotencyKey,
    currency: "NGN",
    status: "PENDING",
  };
}

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
