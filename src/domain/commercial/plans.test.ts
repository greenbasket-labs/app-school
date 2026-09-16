import { describe, expect, it } from "vitest";
import { allocateResultRevenue, getCommercialPlan, normalizeResultAccessSettings } from "./plans";

describe("commercial plans", () => {
  it("keeps plan pricing and revenue shares centralized", () => {
    expect(getCommercialPlan("FREE").monthlyPriceNaira).toBe(0);
    expect(getCommercialPlan("BASIC").monthlyPriceNaira).toBe(5_000);
    expect(getCommercialPlan("STARTER").resultSchoolSharePercent).toBe(50);
    expect(getCommercialPlan("PRO").resultSchoolSharePercent).toBe(75);
    expect(getCommercialPlan("PREMIUM").resultSchoolSharePercent).toBe(100);
  });

  it("allocates result revenue from the configured amount", () => {
    expect(allocateResultRevenue(200, "BASIC")).toEqual({
      grossAmount: 200,
      schoolShare: 50,
      appSchoolShare: 150,
    });
    expect(allocateResultRevenue(500, "PRO")).toEqual({
      grossAmount: 500,
      schoolShare: 375,
      appSchoolShare: 125,
    });
    expect(allocateResultRevenue(500, "PREMIUM")).toEqual({
      grossAmount: 500,
      schoolShare: 500,
      appSchoolShare: 0,
    });
  });

  it("allows free result access without a paid transaction", () => {
    expect(normalizeResultAccessSettings({ enabled: true, amountNaira: 0 })).toEqual({
      enabled: false,
      amountNaira: 0,
    });
  });

  it("rejects negative result access amounts", () => {
    expect(() => normalizeResultAccessSettings({ enabled: true, amountNaira: -1 })).toThrow();
    expect(() => allocateResultRevenue(-1, "BASIC")).toThrow();
  });
});
