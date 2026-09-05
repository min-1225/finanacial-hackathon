import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AI 클라이언트만 mock 한다. 스키마 검증과 근거 재검증은 실제 코드가 수행한다.
const { requestStructuredJson } = vi.hoisted(() => ({
  requestStructuredJson: vi.fn(),
}));

vi.mock("@/lib/ai/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/client")>(
    "@/lib/ai/client",
  );
  return { ...actual, requestStructuredJson };
});

import { AiError } from "@/lib/ai/client";
import { structurePrinciples, AiSchemaError } from "@/lib/ai/structure-principles";
import { extractProductTerms } from "@/lib/ai/extract-product-terms";
import { analyzeProduct } from "@/lib/analysis/analyze-product";
import { getProduct } from "@/lib/products/repository";

const FULL_LOSS = getProduct("structured-note-full-loss");

const REAL_QUOTE =
  "본 상품은 원금이 보장되지 않으며 투자원금의 전부 또는 일부에 손실이 발생할 수 있습니다.";

beforeEach(() => {
  requestStructuredJson.mockReset();
  vi.stubEnv("USE_FIXTURE_MODE", "false");
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("금융 원칙 구조화", () => {
  it("스키마를 통과하면 초안을 만들고 빈 항목만 질문한다", async () => {
    requestStructuredJson.mockResolvedValue({
      purpose: "전세자금",
      useWithinMonths: 12,
      principalLossAllowed: false,
      earlyWithdrawalRequired: true,
      clarifications: [
        { field: "depositProtectionRequired", question: "예금자보호가 꼭 필요하신가요?" },
      ],
    });

    const draft = await structurePrinciples("1년 뒤 전세자금입니다.");

    expect(draft.useWithinMonths).toBe(12);
    // 원금손실 불허이면 허용 손실 한도는 0으로 파생된다.
    expect(draft.maxLossPercent).toBe(0);
    expect(draft.clarificationQuestions.map((q) => q.field)).toEqual([
      "depositProtectionRequired",
    ]);
    // AI 가 만든 질문 문구를 쓰되 선택지는 프로젝트 템플릿을 사용한다.
    expect(draft.clarificationQuestions[0].question).toBe("예금자보호가 꼭 필요하신가요?");
    expect(draft.clarificationQuestions[0].options.length).toBeGreaterThan(1);
  });

  it("AI 가 필요한 질문을 빠뜨려도 프로젝트가 질문을 채운다", async () => {
    requestStructuredJson.mockResolvedValue({ clarifications: [] });

    const draft = await structurePrinciples("돈을 굴리고 싶습니다.");

    expect(draft.clarificationQuestions.length).toBeGreaterThan(0);
    expect(draft.clarificationQuestions.map((q) => q.field)).toContain(
      "principalLossAllowed",
    );
  });

  it("스키마를 벗어난 응답은 사용하지 않는다", async () => {
    requestStructuredJson.mockResolvedValue({
      useWithinMonths: 12,
      recommendation: "이 상품을 추천합니다",
      clarifications: [],
    });

    await expect(structurePrinciples("아무 문장")).rejects.toBeInstanceOf(AiSchemaError);
  });

  it("허용 범위를 벗어난 손실률은 거부한다", async () => {
    requestStructuredJson.mockResolvedValue({
      maxLossPercent: 250,
      clarifications: [],
    });

    await expect(structurePrinciples("아무 문장")).rejects.toBeInstanceOf(AiSchemaError);
  });

  it("AI 호출 실패는 그대로 전달한다", async () => {
    requestStructuredJson.mockRejectedValue(new AiError("NETWORK", "실패"));

    await expect(structurePrinciples("아무 문장")).rejects.toBeInstanceOf(AiError);
  });
});

describe("상품 조건 추출", () => {
  it("문서에 없는 조건은 빈 값으로 남는다", async () => {
    requestStructuredJson.mockResolvedValue({
      conditions: [
        {
          field: "principalLossPossible",
          booleanValue: true,
          quote: REAL_QUOTE,
          page: 3,
        },
      ],
    });

    const candidate = await extractProductTerms(FULL_LOSS.manifest, FULL_LOSS.pages);

    expect(candidate.principalLossPossible.value).toBe(true);
    expect(candidate.maxLossPercent).toEqual({ value: null, evidence: null });
  });

  it("필드 타입과 맞지 않는 값은 버린다", async () => {
    requestStructuredJson.mockResolvedValue({
      conditions: [
        // boolean 필드인데 숫자만 준 경우
        { field: "depositProtected", numberValue: 1, quote: REAL_QUOTE, page: 4 },
        // 만기가 정수가 아닌 경우
        { field: "maturityMonths", numberValue: 12.5, quote: REAL_QUOTE, page: 2 },
      ],
    });

    const candidate = await extractProductTerms(FULL_LOSS.manifest, FULL_LOSS.pages);

    expect(candidate.depositProtected.value).toBeNull();
    expect(candidate.maturityMonths.value).toBeNull();
  });
});

describe("분석 파이프라인", () => {
  it("원문이 실제 페이지에 있으면 근거를 확인한다", async () => {
    requestStructuredJson.mockResolvedValue({
      conditions: [
        {
          field: "principalLossPossible",
          booleanValue: true,
          quote: REAL_QUOTE,
          page: 3,
        },
      ],
    });

    const analysis = await analyzeProduct("structured-note-full-loss");
    if (!analysis.ok) throw new Error("분석이 실패했습니다.");

    expect(analysis.terms.principalLossPossible.evidence?.verified).toBe(true);
    expect(analysis.terms.principalLossPossible.value).toBe(true);
    expect(analysis.fixture).toBe(false);
  });

  it("원문이 지정 페이지에 없으면 값을 버린다", async () => {
    requestStructuredJson.mockResolvedValue({
      conditions: [
        // 실제로는 3페이지에 있는 문장을 2페이지라고 주장한 경우
        {
          field: "principalLossPossible",
          booleanValue: true,
          quote: REAL_QUOTE,
          page: 2,
        },
        // 문서에 아예 없는 문장을 지어낸 경우
        {
          field: "maxLossPercent",
          numberValue: 10,
          quote: "최대 손실은 10%로 제한됩니다.",
          page: 3,
        },
      ],
    });

    const analysis = await analyzeProduct("structured-note-full-loss");
    if (!analysis.ok) throw new Error("분석이 실패했습니다.");

    expect(analysis.terms.principalLossPossible.value).toBeNull();
    expect(analysis.terms.principalLossPossible.evidence?.verified).toBe(false);
    expect(analysis.terms.maxLossPercent.value).toBeNull();
    expect(analysis.terms.maxLossPercent.evidence?.verified).toBe(false);
  });

  it("페이지가 누락된 문서는 AI 를 호출하지 않는다", async () => {
    const analysis = await analyzeProduct("structured-note-missing-page");

    expect(analysis.ok).toBe(false);
    expect(requestStructuredJson).not.toHaveBeenCalled();
  });
});
