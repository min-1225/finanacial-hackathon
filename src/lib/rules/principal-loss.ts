import type { ConfirmedUserPrinciples, ProductTerms, RuleResult } from "@/lib/domain/types";
import {
  conditionConfirmed,
  hold,
  holdForUnconfirmedPrinciple,
  resolveCondition,
  violation,
} from "./shared";

const PRINCIPLE = "principalLoss" as const;

/** 원금손실 허용 여부 대조. */
export function evaluatePrincipalLoss(
  principles: ConfirmedUserPrinciples,
  terms: ProductTerms,
): RuleResult {
  if (principles.principalLossAllowed === null) {
    return holdForUnconfirmedPrinciple(PRINCIPLE, "원금손실 허용 여부");
  }

  const product = resolveCondition(terms.principalLossPossible);
  if (!product.ok) {
    return hold(PRINCIPLE, "원금손실 가능 여부를 확인할 수 없습니다.", product.reason);
  }

  if (!principles.principalLossAllowed && product.value) {
    return violation(
      PRINCIPLE,
      "원금손실을 허용하지 않기로 확정했지만 상품 문서에는 원금손실이 발생할 수 있다고 명시되어 있습니다.",
      [product.evidence],
    );
  }

  return conditionConfirmed(
    PRINCIPLE,
    product.value
      ? "원금손실을 허용하기로 확정했고 상품 문서에도 원금손실 가능성이 명시되어 있습니다."
      : "상품 문서에서 원금손실이 발생하지 않는다고 확인했습니다.",
    [product.evidence],
  );
}
