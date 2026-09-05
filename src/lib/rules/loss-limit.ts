import type { ConfirmedUserPrinciples, ProductTerms, RuleResult } from "@/lib/domain/types";
import {
  conditionConfirmed,
  hold,
  holdForUnconfirmedPrinciple,
  resolveCondition,
  violation,
} from "./shared";

const PRINCIPLE = "lossLimit" as const;

/** 허용 손실 한도 대조. */
export function evaluateLossLimit(
  principles: ConfirmedUserPrinciples,
  terms: ProductTerms,
): RuleResult {
  if (principles.maxLossPercent === null) {
    return holdForUnconfirmedPrinciple(PRINCIPLE, "허용 손실 한도");
  }

  const product = resolveCondition(terms.maxLossPercent);
  if (!product.ok) {
    return hold(
      PRINCIPLE,
      `허용 손실 한도를 최대 ${principles.maxLossPercent}%로 확정했지만 상품 문서의 최대 손실 범위를 확인할 수 없습니다.`,
      product.reason,
    );
  }

  if (product.value > principles.maxLossPercent) {
    return violation(
      PRINCIPLE,
      `허용 손실 한도는 최대 ${principles.maxLossPercent}%인데 상품 문서에는 최대 ${product.value}% 손실이 가능하다고 명시되어 있습니다.`,
      [product.evidence],
    );
  }

  return conditionConfirmed(
    PRINCIPLE,
    `상품 문서에 명시된 최대 손실 ${product.value}%는 확정한 허용 한도 ${principles.maxLossPercent}% 이내입니다.`,
    [product.evidence],
  );
}
