import type {
  ConfirmedUserPrinciples,
  Evidence,
  ProductCondition,
  ProductTerms,
} from "@/lib/domain/types";

export function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return { quote: "테스트 근거 문장입니다.", page: 1, verified: true, ...overrides };
}

export function condition<T>(
  value: T,
  overrides: Partial<Evidence> = {},
): ProductCondition<T> {
  return { value, evidence: evidence(overrides) };
}

export const NO_CONDITION: ProductCondition<never> = { value: null, evidence: null };

export function principles(
  overrides: Partial<ConfirmedUserPrinciples> = {},
): ConfirmedUserPrinciples {
  return {
    purpose: "전세자금",
    useWithinMonths: 12,
    principalLossAllowed: false,
    maxLossPercent: 0,
    earlyWithdrawalRequired: true,
    earlyWithdrawalPrincipalLossAllowed: false,
    depositProtectionRequired: true,
    confirmation: "CONFIRMED",
    confirmedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

export function terms(overrides: Partial<ProductTerms> = {}): ProductTerms {
  return {
    principalLossPossible: condition(true, { page: 3 }),
    maxLossPercent: condition(100, { page: 3 }),
    maturityMonths: condition(36, { page: 2 }),
    earlyRedemptionAllowed: condition(true, { page: 4 }),
    earlyRedemptionLossPossible: condition(true, { page: 4 }),
    depositProtected: condition(false, { page: 4 }),
    ...overrides,
  };
}
