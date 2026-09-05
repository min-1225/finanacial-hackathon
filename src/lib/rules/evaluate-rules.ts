import type { ConfirmedUserPrinciples, ProductTerms, RuleResult } from "@/lib/domain/types";
import { evaluatePrincipalLoss } from "./principal-loss";
import { evaluateLossLimit } from "./loss-limit";
import { evaluateLiquidityHorizon } from "./liquidity-horizon";
import { evaluateEarlyRedemption } from "./early-redemption";
import { evaluateDepositProtection } from "./deposit-protection";

/**
 * 결정론적 규칙 엔진.
 *
 * 확정한 금융 원칙과 근거가 확인된 상품 조건만 비교한다.
 * 동기 순수 함수이며 동일 입력에는 항상 동일한 결과를 돌려준다.
 */
export function evaluateRules(
  principles: ConfirmedUserPrinciples,
  terms: ProductTerms,
): RuleResult[] {
  return [
    evaluatePrincipalLoss(principles, terms),
    evaluateLossLimit(principles, terms),
    evaluateLiquidityHorizon(principles, terms),
    evaluateEarlyRedemption(principles, terms),
    evaluateDepositProtection(principles, terms),
  ];
}

export const PRINCIPLE_LABELS = {
  principalLoss: "원금손실 허용 여부",
  lossLimit: "허용 손실 한도",
  liquidityHorizon: "자금 사용 시점과 상품 만기",
  earlyRedemption: "중도환매 조건",
  depositProtection: "예금자보호",
} as const;
