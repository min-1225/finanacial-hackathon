import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeProduct } from "@/lib/analysis/analyze-product";
import { evaluateRules } from "@/lib/rules/evaluate-rules";
import { structurePrinciplesFixture, DEMO_INPUTS } from "@/lib/fixtures/principles";
import {
  applyClarificationAnswer,
  confirmPrinciples,
  isReadyToConfirm,
} from "@/lib/domain/principles";
import { RuleResultListSchema } from "@/lib/domain/schemas";
import type { PrincipleKey, RuleResult, UserPrincipleValues } from "@/lib/domain/types";

const CONFIRMED_AT = new Date("2026-03-01T00:00:00.000Z");

function statusOf(results: RuleResult[], principle: PrincipleKey) {
  const found = results.find((result) => result.principle === principle);
  if (!found) throw new Error(`결과에 ${principle} 이 없습니다.`);
  return found.status;
}

function valuesOf(input: string): UserPrincipleValues {
  const { clarificationQuestions: _questions, ...values } =
    structurePrinciplesFixture(input);
  return values;
}

describe("기능명세서 시나리오", () => {
  // 시나리오 테스트는 AI 를 호출하지 않고 fixture 로만 검증한다.
  beforeEach(() => {
    vi.stubEnv("USE_FIXTURE_MODE", "true");
  });

  it("시나리오 1: 전세자금 — 네 원칙이 모두 위반으로 나온다", async () => {
    const draft = structurePrinciplesFixture(DEMO_INPUTS[0].text);

    // 예금자보호 필요 여부만 추가 질문한다.
    expect(draft.clarificationQuestions.map((q) => q.field)).toEqual([
      "depositProtectionRequired",
    ]);
    expect(isReadyToConfirm(draft)).toBe(false);

    const answered = applyClarificationAnswer(
      valuesOf(DEMO_INPUTS[0].text),
      "depositProtectionRequired",
      "true",
    );
    const confirmed = confirmPrinciples(answered, CONFIRMED_AT);
    expect(confirmed.confirmation).toBe("CONFIRMED");
    expect(confirmed.maxLossPercent).toBe(0);

    const analysis = await analyzeProduct("structured-note-full-loss");
    if (!analysis.ok) throw new Error("정상 문서 분석이 실패했습니다.");

    const results = evaluateRules(confirmed, analysis.terms);
    expect(RuleResultListSchema.safeParse(results).success).toBe(true);
    expect(statusOf(results, "principalLoss")).toBe("VIOLATION");
    expect(statusOf(results, "liquidityHorizon")).toBe("VIOLATION");
    expect(statusOf(results, "earlyRedemption")).toBe("VIOLATION");
    expect(statusOf(results, "depositProtection")).toBe("VIOLATION");

    for (const result of results) {
      if (result.status === "HOLD") continue;
      expect(result.evidence.every((item) => item.verified)).toBe(true);
      expect(result.evidence[0].page).toBeGreaterThan(0);
    }
  });

  it("시나리오 2: 최대 10% 손실 허용 + 상품 최대 100% 손실 → 한도 위반", async () => {
    const values = valuesOf(DEMO_INPUTS[1].text);
    expect(structurePrinciplesFixture(DEMO_INPUTS[1].text).clarificationQuestions)
      .toHaveLength(0);

    const confirmed = confirmPrinciples(values, CONFIRMED_AT);
    const analysis = await analyzeProduct("structured-note-full-loss");
    if (!analysis.ok) throw new Error("정상 문서 분석이 실패했습니다.");

    const results = evaluateRules(confirmed, analysis.terms);
    expect(statusOf(results, "lossLimit")).toBe("VIOLATION");
    expect(statusOf(results, "principalLoss")).toBe("CONDITION_CONFIRMED");
  });

  it("시나리오 3: 최대 손실 한도 미기재 문서 → 한도는 보류", async () => {
    const confirmed = confirmPrinciples(valuesOf(DEMO_INPUTS[1].text), CONFIRMED_AT);
    const analysis = await analyzeProduct("structured-note-unknown-limit");
    if (!analysis.ok) throw new Error("정상 문서 분석이 실패했습니다.");

    const results = evaluateRules(confirmed, analysis.terms);
    expect(statusOf(results, "lossLimit")).toBe("HOLD");
    // 손실 가능성 자체는 문서에 명시되어 있으므로 보류가 아니다.
    expect(statusOf(results, "principalLoss")).toBe("CONDITION_CONFIRMED");
  });

  it("예외 시나리오: 페이지 누락 문서는 조건 추출 전에 중단된다", async () => {
    const analysis = await analyzeProduct("structured-note-missing-page");
    expect(analysis.ok).toBe(false);
    if (analysis.ok) return;
    expect(analysis.reason).toBe("DOCUMENT_INCOMPLETE");
    expect(analysis.status.missingPages).toEqual([3]);
    expect(analysis.status.complete).toBe(false);
  });
});
