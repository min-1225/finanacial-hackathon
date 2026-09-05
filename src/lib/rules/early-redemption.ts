import type { ConfirmedUserPrinciples, ProductTerms, RuleResult } from "@/lib/domain/types";
import {
  conditionConfirmed,
  hold,
  holdForUnconfirmedPrinciple,
  resolveCondition,
  violation,
} from "./shared";

const PRINCIPLE = "earlyRedemption" as const;

/**
 * 중도환매 조건 대조.
 *
 * 중도환매 가능 여부와 중도환매 시 손실 가능 여부를 모두 확인한다.
 * 필요한 조건 중 하나라도 근거가 없으면 보류로 처리한다.
 */
export function evaluateEarlyRedemption(
  principles: ConfirmedUserPrinciples,
  terms: ProductTerms,
): RuleResult {
  if (principles.earlyWithdrawalRequired === null) {
    return holdForUnconfirmedPrinciple(PRINCIPLE, "중도인출 필요 여부");
  }

  const allowed = resolveCondition(terms.earlyRedemptionAllowed);
  if (!allowed.ok) {
    return hold(PRINCIPLE, "중도환매 가능 여부를 확인할 수 없습니다.", allowed.reason);
  }

  if (!principles.earlyWithdrawalRequired) {
    return conditionConfirmed(
      PRINCIPLE,
      allowed.value
        ? "중도인출을 필수 조건으로 두지 않았고 상품은 중도환매가 가능합니다."
        : "중도인출을 필수 조건으로 두지 않았으며 상품은 중도환매가 불가능합니다.",
      [allowed.evidence],
    );
  }

  if (!allowed.value) {
    return violation(
      PRINCIPLE,
      "필요할 때 중도인출이 가능해야 한다고 확정했지만 상품 문서에는 중도환매가 불가능하다고 명시되어 있습니다.",
      [allowed.evidence],
    );
  }

  if (principles.earlyWithdrawalPrincipalLossAllowed === null) {
    return holdForUnconfirmedPrinciple(PRINCIPLE, "중도인출 시 원금손실 허용 여부");
  }

  const lossPossible = resolveCondition(terms.earlyRedemptionLossPossible);
  if (!lossPossible.ok) {
    return hold(
      PRINCIPLE,
      "중도환매 시 원금손실 가능 여부를 확인할 수 없습니다.",
      lossPossible.reason,
    );
  }

  const evidence = [allowed.evidence, lossPossible.evidence];

  if (!principles.earlyWithdrawalPrincipalLossAllowed && lossPossible.value) {
    return violation(
      PRINCIPLE,
      "중도인출 시 원금손실을 허용하지 않기로 확정했지만 상품 문서에는 중도환매 시 원금손실이 발생할 수 있다고 명시되어 있습니다.",
      evidence,
    );
  }

  return conditionConfirmed(
    PRINCIPLE,
    lossPossible.value
      ? "중도환매가 가능하고 중도환매 시 손실 가능성도 확정한 원칙 범위 안에 있습니다."
      : "중도환매가 가능하며 상품 문서에서 중도환매 시 원금손실이 없다고 확인했습니다.",
    evidence,
  );
}
