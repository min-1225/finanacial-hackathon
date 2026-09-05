import type { ConfirmedUserPrinciples, ProductTerms, RuleResult } from "@/lib/domain/types";
import {
  conditionConfirmed,
  hold,
  holdForUnconfirmedPrinciple,
  resolveCondition,
  violation,
} from "./shared";

const PRINCIPLE = "depositProtection" as const;

/** 예금자보호 필요 여부 대조. */
export function evaluateDepositProtection(
  principles: ConfirmedUserPrinciples,
  terms: ProductTerms,
): RuleResult {
  if (principles.depositProtectionRequired === null) {
    return holdForUnconfirmedPrinciple(PRINCIPLE, "예금자보호 필요 여부");
  }

  const product = resolveCondition(terms.depositProtected);
  if (!product.ok) {
    return hold(PRINCIPLE, "예금자보호 대상 여부를 확인할 수 없습니다.", product.reason);
  }

  if (principles.depositProtectionRequired && !product.value) {
    return violation(
      PRINCIPLE,
      "예금자보호가 필요하다고 확정했지만 상품 문서에는 예금자보호 대상이 아니라고 명시되어 있습니다.",
      [product.evidence],
    );
  }

  return conditionConfirmed(
    PRINCIPLE,
    product.value
      ? "상품 문서에서 예금자보호 대상임을 확인했습니다."
      : "예금자보호를 필수 조건으로 두지 않았으며 상품은 예금자보호 대상이 아닙니다.",
    [product.evidence],
  );
}
