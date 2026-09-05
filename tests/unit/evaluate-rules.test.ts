import { describe, expect, it } from "vitest";
import { evaluateRules } from "@/lib/rules/evaluate-rules";
import { PRINCIPLE_KEYS, RuleResultListSchema } from "@/lib/domain/schemas";
import type { PrincipleKey, RuleResult } from "@/lib/domain/types";
import { NO_CONDITION, condition, principles, terms } from "./factories";

function statusOf(results: RuleResult[], principle: PrincipleKey) {
  const found = results.find((result) => result.principle === principle);
  if (!found) throw new Error(`결과에 ${principle} 이 없습니다.`);
  return found.status;
}

describe("evaluateRules", () => {
  it("다섯 원칙을 고정 순서로 정확히 한 번씩 반환한다", () => {
    const results = evaluateRules(principles(), terms());
    expect(results.map((result) => result.principle)).toEqual([...PRINCIPLE_KEYS]);
    expect(RuleResultListSchema.safeParse(results).success).toBe(true);
  });

  it("같은 입력에 항상 같은 결과를 반환한다", () => {
    const first = evaluateRules(principles(), terms());
    const second = evaluateRules(principles(), terms());
    expect(first).toEqual(second);
  });

  it("원금손실 불허 + 상품 손실 가능 → 위반", () => {
    const results = evaluateRules(
      principles({ principalLossAllowed: false }),
      terms({ principalLossPossible: condition(true) }),
    );
    expect(statusOf(results, "principalLoss")).toBe("VIOLATION");
  });

  it("원금손실 허용 + 상품 손실 가능 → 관련 조건 확인", () => {
    const results = evaluateRules(
      principles({ principalLossAllowed: true, maxLossPercent: 50 }),
      terms({ principalLossPossible: condition(true) }),
    );
    expect(statusOf(results, "principalLoss")).toBe("CONDITION_CONFIRMED");
  });

  it("상품 손실 조건 근거 미확인 → 보류", () => {
    const results = evaluateRules(
      principles(),
      terms({
        principalLossPossible: {
          value: true,
          evidence: { quote: "확인되지 않은 문장", page: 3, verified: false },
        },
      }),
    );
    expect(statusOf(results, "principalLoss")).toBe("HOLD");
  });

  it("Evidence 자체가 없으면 보류", () => {
    const results = evaluateRules(
      principles(),
      terms({ principalLossPossible: NO_CONDITION }),
    );
    expect(statusOf(results, "principalLoss")).toBe("HOLD");
  });

  it("사용자 한도 10% + 상품 최대 손실 30% → 위반", () => {
    const results = evaluateRules(
      principles({ principalLossAllowed: true, maxLossPercent: 10 }),
      terms({ maxLossPercent: condition(30) }),
    );
    expect(statusOf(results, "lossLimit")).toBe("VIOLATION");
  });

  it("사용자 한도 10% + 상품 최대 손실 10% → 관련 조건 확인", () => {
    const results = evaluateRules(
      principles({ principalLossAllowed: true, maxLossPercent: 10 }),
      terms({ maxLossPercent: condition(10) }),
    );
    expect(statusOf(results, "lossLimit")).toBe("CONDITION_CONFIRMED");
  });

  it("사용자 한도 10% + 상품 최대 손실 미기재 → 보류", () => {
    const results = evaluateRules(
      principles({ principalLossAllowed: true, maxLossPercent: 10 }),
      terms({ maxLossPercent: NO_CONDITION }),
    );
    expect(statusOf(results, "lossLimit")).toBe("HOLD");
  });

  it("자금 사용 12개월 + 상품 만기 36개월 → 위반", () => {
    const results = evaluateRules(
      principles({ useWithinMonths: 12 }),
      terms({ maturityMonths: condition(36) }),
    );
    expect(statusOf(results, "liquidityHorizon")).toBe("VIOLATION");
  });

  it("자금 사용 36개월 + 상품 만기 36개월 → 관련 조건 확인", () => {
    const results = evaluateRules(
      principles({ useWithinMonths: 36 }),
      terms({ maturityMonths: condition(36) }),
    );
    expect(statusOf(results, "liquidityHorizon")).toBe("CONDITION_CONFIRMED");
  });

  it("중도인출 필요 + 상품 환매 불가 → 위반", () => {
    const results = evaluateRules(
      principles({ earlyWithdrawalRequired: true }),
      terms({ earlyRedemptionAllowed: condition(false) }),
    );
    expect(statusOf(results, "earlyRedemption")).toBe("VIOLATION");
  });

  it("환매 손실 불허 + 상품 환매 손실 가능 → 위반", () => {
    const results = evaluateRules(
      principles({
        earlyWithdrawalRequired: true,
        earlyWithdrawalPrincipalLossAllowed: false,
      }),
      terms({
        earlyRedemptionAllowed: condition(true),
        earlyRedemptionLossPossible: condition(true),
      }),
    );
    expect(statusOf(results, "earlyRedemption")).toBe("VIOLATION");
  });

  it("중도환매 손실 근거가 없으면 보류", () => {
    const results = evaluateRules(
      principles({ earlyWithdrawalRequired: true }),
      terms({
        earlyRedemptionAllowed: condition(true),
        earlyRedemptionLossPossible: NO_CONDITION,
      }),
    );
    expect(statusOf(results, "earlyRedemption")).toBe("HOLD");
  });

  it("예금자보호 필요 + 보호 대상 아님 → 위반", () => {
    const results = evaluateRules(
      principles({ depositProtectionRequired: true }),
      terms({ depositProtected: condition(false) }),
    );
    expect(statusOf(results, "depositProtection")).toBe("VIOLATION");
  });

  it("예금자보호 불필요 + 보호 대상 아님 → 관련 조건 확인", () => {
    const results = evaluateRules(
      principles({ depositProtectionRequired: false }),
      terms({ depositProtected: condition(false) }),
    );
    expect(statusOf(results, "depositProtection")).toBe("CONDITION_CONFIRMED");
  });

  it("사용자 원칙 값이 미확정이면 보류", () => {
    const results = evaluateRules(
      principles({
        useWithinMonths: null,
        principalLossAllowed: null,
        maxLossPercent: null,
        earlyWithdrawalRequired: null,
        depositProtectionRequired: null,
      }),
      terms(),
    );
    expect(results.every((result) => result.status === "HOLD")).toBe(true);
  });

  it("보류가 아닌 결과의 근거는 모두 확인된 근거다", () => {
    const results = evaluateRules(principles(), terms());
    for (const result of results) {
      if (result.status === "HOLD") continue;
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence.every((item) => item.verified)).toBe(true);
    }
  });
});
