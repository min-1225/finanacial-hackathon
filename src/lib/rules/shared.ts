import type {
  Evidence,
  ProductCondition,
  RuleResult,
  PrincipleKey,
} from "@/lib/domain/types";

/**
 * 규칙 엔진 공용 헬퍼.
 *
 * 이 모듈과 개별 규칙 함수는 순수 함수다.
 * 네트워크, 파일, 환경변수, 시스템 시간에 접근하지 않는다.
 */

export type ResolvedCondition<T> =
  | { ok: true; value: T; evidence: Evidence }
  | { ok: false; reason: HoldReason };

export type HoldReason =
  | "PRODUCT_VALUE_MISSING"
  | "PRODUCT_EVIDENCE_MISSING"
  | "PRODUCT_EVIDENCE_UNVERIFIED";

const HOLD_REASON_TEXT: Record<HoldReason, string> = {
  PRODUCT_VALUE_MISSING: "상품 문서에서 해당 조건을 찾지 못했습니다.",
  PRODUCT_EVIDENCE_MISSING: "해당 조건을 뒷받침하는 원문 근거가 없습니다.",
  PRODUCT_EVIDENCE_UNVERIFIED:
    "제시된 원문을 지정한 페이지에서 확인하지 못했습니다.",
};

/** 판정에 사용할 수 있는 상품 조건인지 확인한다. */
export function resolveCondition<T>(
  condition: ProductCondition<T>,
): ResolvedCondition<T> {
  if (condition.evidence === null) {
    return { ok: false, reason: "PRODUCT_EVIDENCE_MISSING" };
  }
  if (!condition.evidence.verified) {
    return { ok: false, reason: "PRODUCT_EVIDENCE_UNVERIFIED" };
  }
  if (condition.value === null) {
    return { ok: false, reason: "PRODUCT_VALUE_MISSING" };
  }
  return { ok: true, value: condition.value, evidence: condition.evidence };
}

export function hold(
  principle: PrincipleKey,
  detail: string,
  reason?: HoldReason,
): RuleResult {
  return {
    principle,
    status: "HOLD",
    summary: reason ? `${detail} ${HOLD_REASON_TEXT[reason]}` : detail,
    evidence: [],
  };
}

export function holdForUnconfirmedPrinciple(
  principle: PrincipleKey,
  label: string,
): RuleResult {
  return hold(principle, `${label}이(가) 확정되지 않아 판정할 수 없습니다.`);
}

export function violation(
  principle: PrincipleKey,
  summary: string,
  evidence: Evidence[],
): RuleResult {
  return { principle, status: "VIOLATION", summary, evidence };
}

export function conditionConfirmed(
  principle: PrincipleKey,
  summary: string,
  evidence: Evidence[],
): RuleResult {
  return { principle, status: "CONDITION_CONFIRMED", summary, evidence };
}

export function formatMonths(months: number): string {
  return months % 12 === 0 ? `${months / 12}년(${months}개월)` : `${months}개월`;
}
