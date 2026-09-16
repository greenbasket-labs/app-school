import { describe, expect, it } from "vitest";
import { evaluateResultAccess } from "./result-access-policy";

describe("result access policy", () => {
  const paid = { enabled: true, amountNaira: 200 };

  it("requires school authorization before anything else", () => {
    expect(evaluateResultAccess({ schoolAuthorized: false, studentAuthorized: true, resultPublished: true, settings: paid, entitled: true })).toEqual({ allowed: false, reason: "SCHOOL_UNAUTHORIZED" });
  });

  it("requires an authorized student relationship", () => {
    expect(evaluateResultAccess({ schoolAuthorized: true, studentAuthorized: false, resultPublished: true, settings: paid, entitled: true })).toEqual({ allowed: false, reason: "STUDENT_UNAUTHORIZED" });
  });

  it("requires publication even when the result is free", () => {
    expect(evaluateResultAccess({ schoolAuthorized: true, studentAuthorized: true, resultPublished: false, settings: { enabled: false, amountNaira: 0 }, entitled: false })).toEqual({ allowed: false, reason: "RESULT_NOT_PUBLISHED" });
  });

  it("allows a published free result without payment", () => {
    expect(evaluateResultAccess({ schoolAuthorized: true, studentAuthorized: true, resultPublished: true, settings: { enabled: false, amountNaira: 0 }, entitled: false })).toEqual({ allowed: true, reason: "FREE" });
  });

  it("requires payment entitlement for a paid result", () => {
    expect(evaluateResultAccess({ schoolAuthorized: true, studentAuthorized: true, resultPublished: true, settings: paid, entitled: false })).toEqual({ allowed: false, reason: "PAYMENT_REQUIRED" });
  });

  it("allows a verified entitlement without creating another charge", () => {
    expect(evaluateResultAccess({ schoolAuthorized: true, studentAuthorized: true, resultPublished: true, settings: paid, entitled: true })).toEqual({ allowed: true, reason: "ENTITLED" });
  });
});
