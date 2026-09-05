import { describe, expect, it } from "vitest";
import {
  normalizeWhitespace,
  verifyEvidence,
  verifyProductTerms,
} from "@/lib/evidence/verify-evidence";
import { ProductTermsSchema } from "@/lib/domain/schemas";
import type { ProductPage, ProductTermsCandidate } from "@/lib/domain/types";

const PAGES: ProductPage[] = [
  { page: 1, text: "표지\n행복이자 파생결합증권" },
  {
    page: 2,
    text: "3. 투자 위험\n본 상품은 원금이 보장되지 않으며   투자원금의 전부 또는\n일부에 손실이 발생할 수 있습니다.",
  },
];

function candidate(
  overrides: Partial<ProductTermsCandidate> = {},
): ProductTermsCandidate {
  return {
    principalLossPossible: { value: null, evidence: null },
    maxLossPercent: { value: null, evidence: null },
    maturityMonths: { value: null, evidence: null },
    earlyRedemptionAllowed: { value: null, evidence: null },
    earlyRedemptionLossPossible: { value: null, evidence: null },
    depositProtected: { value: null, evidence: null },
    ...overrides,
  };
}

describe("근거 재검증", () => {
  it("연속 공백과 줄바꿈을 하나의 공백으로 정규화한다", () => {
    expect(normalizeWhitespace("가   나\n\n다 ")).toBe("가 나 다");
  });

  it("원문이 지정 페이지에 있으면 확인 처리한다", () => {
    const result = verifyEvidence(
      {
        quote: "본 상품은 원금이 보장되지 않으며 투자원금의 전부 또는 일부에 손실이 발생할 수 있습니다.",
        page: 2,
      },
      PAGES,
    );
    expect(result.evidence.verified).toBe(true);
    expect(result.failure).toBeNull();
  });

  it("원문이 지정 페이지에 없으면 미확인 처리한다", () => {
    const result = verifyEvidence(
      { quote: "원금이 보장됩니다.", page: 2 },
      PAGES,
    );
    expect(result.evidence.verified).toBe(false);
    expect(result.failure).toBe("QUOTE_NOT_FOUND");
  });

  it("문서에 없는 페이지 번호는 미확인 처리한다", () => {
    const result = verifyEvidence({ quote: "표지", page: 99 }, PAGES);
    expect(result.evidence.verified).toBe(false);
    expect(result.failure).toBe("PAGE_OUT_OF_RANGE");
  });

  it("다른 페이지에 있는 원문은 확인하지 않는다", () => {
    const result = verifyEvidence({ quote: "표지", page: 2 }, PAGES);
    expect(result.evidence.verified).toBe(false);
  });

  it("근거를 확인하지 못한 조건의 값은 제거한다", () => {
    const { terms, failures } = verifyProductTerms(
      candidate({
        maturityMonths: {
          value: 36,
          evidence: { quote: "만기는 36개월입니다.", page: 2 },
        },
      }),
      PAGES,
    );
    expect(terms.maturityMonths.value).toBeNull();
    expect(terms.maturityMonths.evidence?.verified).toBe(false);
    expect(failures).toEqual([
      { field: "maturityMonths", failure: "QUOTE_NOT_FOUND" },
    ]);
    expect(ProductTermsSchema.safeParse(terms).success).toBe(true);
  });
});
