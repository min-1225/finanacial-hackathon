import type { ConfirmedUserPrinciples, ProductTerms, RuleResult } from "@/lib/domain/types";
import {
  conditionConfirmed,
  formatMonths,
  hold,
  holdForUnconfirmedPrinciple,
  resolveCondition,
  violation,
} from "./shared";

const PRINCIPLE = "liquidityHorizon" as const;

/** 자금 사용 예정 시점과 상품 만기 대조. */
export function evaluateLiquidityHorizon(
  principles: ConfirmedUserPrinciples,
  terms: ProductTerms,
): RuleResult {
  if (principles.useWithinMonths === null) {
    return holdForUnconfirmedPrinciple(PRINCIPLE, "자금 사용 예정 시점");
  }

  const product = resolveCondition(terms.maturityMonths);
  if (!product.ok) {
    return hold(PRINCIPLE, "상품 만기를 확인할 수 없습니다.", product.reason);
  }

  const useWithin = formatMonths(principles.useWithinMonths);
  const maturity = formatMonths(product.value);

  if (product.value > principles.useWithinMonths) {
    return violation(
      PRINCIPLE,
      `자금을 ${useWithin} 안에 사용할 예정인데 상품 만기는 ${maturity}입니다.`,
      [product.evidence],
    );
  }

  return conditionConfirmed(
    PRINCIPLE,
    `상품 만기 ${maturity}는 자금 사용 예정 시점 ${useWithin} 이내입니다.`,
    [product.evidence],
  );
}
