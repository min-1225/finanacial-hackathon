import { describe, expect, it } from "vitest";
import {
  ConfirmedUserPrinciplesSchema,
  EvidenceSchema,
  ProductTermsSchema,
  RuleResultListSchema,
  RuleResultSchema,
  UserPrinciplesDraftSchema,
} from "@/lib/domain/schemas";
import { condition, evidence, terms } from "./factories";

describe("도메인 스키마", () => {
  it("허용 손실 한도가 100%를 넘으면 거부한다", () => {
    const result = UserPrinciplesDraftSchema.safeParse({
      purpose: null,
      useWithinMonths: 12,
      principalLossAllowed: true,
      maxLossPercent: 120,
      earlyWithdrawalRequired: false,
      earlyWithdrawalPrincipalLossAllowed: null,
      depositProtectionRequired: false,
      clarificationQuestions: [],
    });
    expect(result.success).toBe(false);
  });

  it("정의하지 않은 필드가 들어오면 거부한다", () => {
    const result = UserPrinciplesDraftSchema.safeParse({
      purpose: null,
      useWithinMonths: null,
      principalLossAllowed: null,
      maxLossPercent: null,
      earlyWithdrawalRequired: null,
      earlyWithdrawalPrincipalLossAllowed: null,
      depositProtectionRequired: null,
      clarificationQuestions: [],
      recommendation: "이 상품을 추천합니다",
    });
    expect(result.success).toBe(false);
  });

  it("페이지 번호가 0 이하이면 거부한다", () => {
    expect(EvidenceSchema.safeParse(evidence({ page: 0 })).success).toBe(false);
    expect(EvidenceSchema.safeParse(evidence({ page: -1 })).success).toBe(false);
    expect(EvidenceSchema.safeParse(evidence({ page: 1.5 })).success).toBe(false);
  });

  it("상품 조건 값이 있는데 근거가 없으면 거부한다", () => {
    const result = ProductTermsSchema.safeParse(
      terms({ maturityMonths: { value: 36, evidence: null } }),
    );
    expect(result.success).toBe(false);
  });

  it("근거가 없는 미기재 조건은 허용한다", () => {
    const result = ProductTermsSchema.safeParse(
      terms({ maxLossPercent: { value: null, evidence: null } }),
    );
    expect(result.success).toBe(true);
  });

  it("초안 타입은 confirmation 필드를 갖지 못한다", () => {
    const draft = {
      purpose: null,
      useWithinMonths: null,
      principalLossAllowed: null,
      maxLossPercent: null,
      earlyWithdrawalRequired: null,
      earlyWithdrawalPrincipalLossAllowed: null,
      depositProtectionRequired: null,
      clarificationQuestions: [],
      confirmation: "CONFIRMED",
    };
    expect(UserPrinciplesDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("확정 타입은 CONFIRMED 와 확정 시각을 요구한다", () => {
    const base = {
      purpose: null,
      useWithinMonths: 12,
      principalLossAllowed: false,
      maxLossPercent: 0,
      earlyWithdrawalRequired: false,
      earlyWithdrawalPrincipalLossAllowed: null,
      depositProtectionRequired: true,
    };
    expect(ConfirmedUserPrinciplesSchema.safeParse(base).success).toBe(false);
    expect(
      ConfirmedUserPrinciplesSchema.safeParse({
        ...base,
        confirmation: "CONFIRMED",
        confirmedAt: "2026-03-01T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("미확인 근거가 포함된 검증 결과는 거부한다", () => {
    const result = RuleResultSchema.safeParse({
      principle: "principalLoss",
      status: "VIOLATION",
      summary: "위반",
      evidence: [evidence({ verified: false })],
    });
    expect(result.success).toBe(false);
  });

  it("보류가 아닌 결과에 근거가 없으면 거부한다", () => {
    const result = RuleResultSchema.safeParse({
      principle: "principalLoss",
      status: "VIOLATION",
      summary: "위반",
      evidence: [],
    });
    expect(result.success).toBe(false);
  });

  it("다섯 원칙이 각각 한 번씩 없으면 거부한다", () => {
    const list = [
      { principle: "principalLoss", status: "HOLD", summary: "보류", evidence: [] },
    ];
    expect(RuleResultListSchema.safeParse(list).success).toBe(false);
  });

  it("근거가 확인된 정상 상품 조건은 통과한다", () => {
    expect(
      ProductTermsSchema.safeParse(terms({ maxLossPercent: condition(30) })).success,
    ).toBe(true);
  });
});
