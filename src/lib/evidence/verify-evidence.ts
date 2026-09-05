import type {
  Evidence,
  ProductCondition,
  ProductPage,
  ProductTerms,
  ProductTermsCandidate,
} from "@/lib/domain/types";
import { PRODUCT_TERM_FIELDS } from "@/lib/domain/schemas";

/**
 * 근거 재검증.
 *
 * AI 가 반환한 원문 후보가 지정한 페이지에 실제로 존재하는지만 확인한다.
 * 이 모듈은 금융 판단을 하지 않고 verified 플래그만 결정한다.
 */

/** 연속 공백과 줄바꿈을 하나의 공백으로 정규화한다. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export type EvidenceVerificationFailure =
  | "PAGE_OUT_OF_RANGE"
  | "QUOTE_NOT_FOUND";

export type EvidenceVerification = {
  evidence: Evidence;
  failure: EvidenceVerificationFailure | null;
};

export function verifyEvidence(
  candidate: { quote: string; page: number },
  pages: readonly ProductPage[],
): EvidenceVerification {
  const page = pages.find((item) => item.page === candidate.page);

  if (!page) {
    return {
      evidence: { ...candidate, verified: false },
      failure: "PAGE_OUT_OF_RANGE",
    };
  }

  const found = normalizeWhitespace(page.text).includes(
    normalizeWhitespace(candidate.quote),
  );

  return {
    evidence: { ...candidate, verified: found },
    failure: found ? null : "QUOTE_NOT_FOUND",
  };
}

function verifyCondition<T>(
  condition: { value: T | null; evidence: { quote: string; page: number } | null },
  pages: readonly ProductPage[],
): { condition: ProductCondition<T>; failure: EvidenceVerificationFailure | null } {
  if (condition.evidence === null) {
    return { condition: { value: null, evidence: null }, failure: null };
  }

  const { evidence, failure } = verifyEvidence(condition.evidence, pages);

  return {
    condition: {
      // 근거를 확인하지 못한 값은 규칙 엔진에 전달하지 않는다.
      value: evidence.verified ? condition.value : null,
      evidence,
    },
    failure,
  };
}

export type TermsVerificationResult = {
  terms: ProductTerms;
  /** 개발 로그용. 사용자 입력 원문은 담지 않는다. */
  failures: { field: string; failure: EvidenceVerificationFailure }[];
};

export function verifyProductTerms(
  candidate: ProductTermsCandidate,
  pages: readonly ProductPage[],
): TermsVerificationResult {
  const terms = {} as Record<string, ProductCondition<unknown>>;
  const failures: { field: string; failure: EvidenceVerificationFailure }[] = [];

  for (const field of PRODUCT_TERM_FIELDS) {
    const result = verifyCondition<boolean | number>(candidate[field], pages);
    terms[field] = result.condition;
    if (result.failure) {
      failures.push({ field, failure: result.failure });
    }
  }

  return { terms: terms as unknown as ProductTerms, failures };
}
