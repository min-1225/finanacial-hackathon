import type {
  ClarificationQuestion,
  ConfirmedUserPrinciples,
  PrincipleField,
  UserPrincipleValues,
} from "./types";
import { ConfirmedUserPrinciplesSchema } from "./schemas";

/**
 * 금융 원칙 값에 대한 도메인 규칙.
 *
 * 어떤 항목이 판정에 반드시 필요한지, 어떤 항목을 추가 질문해야 하는지를
 * 한 곳에서 결정한다. AI 응답과 사용자 수정 결과 모두 이 규칙을 통과한다.
 */

export const PRINCIPLE_FIELD_LABELS: Record<PrincipleField, string> = {
  purpose: "자금 목적",
  useWithinMonths: "사용 예정 기간",
  principalLossAllowed: "원금손실 허용 여부",
  maxLossPercent: "최대 허용 손실률",
  earlyWithdrawalRequired: "중도인출 필요 여부",
  earlyWithdrawalPrincipalLossAllowed: "중도인출 시 원금손실 허용 여부",
  depositProtectionRequired: "예금자보호 필요 여부",
};

export const EMPTY_PRINCIPLE_VALUES: UserPrincipleValues = {
  purpose: null,
  useWithinMonths: null,
  principalLossAllowed: null,
  maxLossPercent: null,
  earlyWithdrawalRequired: null,
  earlyWithdrawalPrincipalLossAllowed: null,
  depositProtectionRequired: null,
};

/**
 * 값 사이의 논리적 함의만 채운다. 사용자가 말하지 않은 정보를 추정하지 않는다.
 * 원금손실을 허용하지 않으면 허용 손실 한도는 0%다.
 * 중도인출이 필요 없으면 중도인출 시 손실 허용 여부는 판정에 쓰지 않는다.
 */
export function normalizePrincipleValues(
  values: UserPrincipleValues,
): UserPrincipleValues {
  const next = { ...values };

  if (next.principalLossAllowed === false) {
    next.maxLossPercent = 0;
    next.earlyWithdrawalPrincipalLossAllowed = false;
  }
  if (next.earlyWithdrawalRequired === false) {
    next.earlyWithdrawalPrincipalLossAllowed = null;
  }

  return next;
}

/** 판정을 위해 반드시 값이 있어야 하는데 아직 비어 있는 항목. */
export function unresolvedRequiredFields(
  values: UserPrincipleValues,
): PrincipleField[] {
  const normalized = normalizePrincipleValues(values);
  const missing: PrincipleField[] = [];

  if (normalized.useWithinMonths === null) missing.push("useWithinMonths");
  if (normalized.principalLossAllowed === null) {
    missing.push("principalLossAllowed");
  } else if (normalized.principalLossAllowed && normalized.maxLossPercent === null) {
    missing.push("maxLossPercent");
  }
  if (normalized.earlyWithdrawalRequired === null) {
    missing.push("earlyWithdrawalRequired");
  } else if (
    normalized.earlyWithdrawalRequired &&
    normalized.earlyWithdrawalPrincipalLossAllowed === null
  ) {
    missing.push("earlyWithdrawalPrincipalLossAllowed");
  }
  if (normalized.depositProtectionRequired === null) {
    missing.push("depositProtectionRequired");
  }

  return missing;
}

const QUESTION_TEMPLATES: Record<
  PrincipleField,
  { question: string; options: { label: string; value: string }[] } | null
> = {
  purpose: null,
  useWithinMonths: {
    question: "이 자금을 언제쯤 사용할 예정인가요?",
    options: [
      { label: "6개월 이내", value: "6" },
      { label: "1년 이내", value: "12" },
      { label: "2년 이내", value: "24" },
      { label: "3년 이후", value: "36" },
    ],
  },
  principalLossAllowed: {
    question: "원금 손실이 발생할 가능성을 감수할 수 있나요?",
    options: [
      { label: "원금 손실은 허용하지 않습니다", value: "false" },
      { label: "일정 범위까지는 허용합니다", value: "true" },
    ],
  },
  maxLossPercent: {
    question: "손실은 최대 어느 정도까지 감당할 수 있나요?",
    options: [
      { label: "최대 5%", value: "5" },
      { label: "최대 10%", value: "10" },
      { label: "최대 20%", value: "20" },
      { label: "최대 50%", value: "50" },
    ],
  },
  earlyWithdrawalRequired: {
    question: "만기 전에 자금을 찾을 수 있어야 하나요?",
    options: [
      { label: "필요합니다", value: "true" },
      { label: "만기까지 두어도 됩니다", value: "false" },
    ],
  },
  earlyWithdrawalPrincipalLossAllowed: {
    question: "중도에 찾을 때 원금 손실이 발생해도 괜찮은가요?",
    options: [
      { label: "중도인출 시에도 원금 손실은 안 됩니다", value: "false" },
      { label: "중도인출 시 손실은 감수할 수 있습니다", value: "true" },
    ],
  },
  depositProtectionRequired: {
    question: "예금자보호 대상 상품이어야 하나요?",
    options: [
      { label: "예금자보호가 필요합니다", value: "true" },
      { label: "반드시 필요하지는 않습니다", value: "false" },
    ],
  },
};

/**
 * 비어 있는 필수 항목에 대해서만 추가 질문을 만든다.
 *
 * questionText 로 AI 가 만든 질문 문구를 넘길 수 있다.
 * 선택지는 항상 프로젝트 템플릿을 사용해 값의 타입이 깨지지 않게 한다.
 */
export function buildClarificationQuestions(
  values: UserPrincipleValues,
  questionText: Partial<Record<PrincipleField, string>> = {},
): ClarificationQuestion[] {
  return unresolvedRequiredFields(values).flatMap((field) => {
    const template = QUESTION_TEMPLATES[field];
    if (!template) return [];
    const override = questionText[field]?.trim();
    return [
      {
        field,
        question: override && override.length <= 200 ? override : template.question,
        options: template.options,
      },
    ];
  });
}

/** 선택형 답변 문자열을 필드 타입에 맞게 반영한다. */
export function applyClarificationAnswer(
  values: UserPrincipleValues,
  field: PrincipleField,
  rawValue: string,
): UserPrincipleValues {
  const next: UserPrincipleValues = { ...values };

  switch (field) {
    case "purpose":
      next.purpose = rawValue.trim() === "" ? null : rawValue.trim();
      break;
    case "useWithinMonths":
    case "maxLossPercent": {
      const parsed = Number(rawValue);
      next[field] = Number.isFinite(parsed) ? parsed : null;
      break;
    }
    default:
      next[field] = rawValue === "true" ? true : rawValue === "false" ? false : null;
      break;
  }

  return normalizePrincipleValues(next);
}

export function isReadyToConfirm(values: UserPrincipleValues): boolean {
  return unresolvedRequiredFields(values).length === 0;
}

/**
 * 사용자 확정. 이 함수를 통해서만 CONFIRMED 상태가 만들어진다.
 * AI 응답 경로에서는 호출하지 않는다.
 */
export function confirmPrinciples(
  values: UserPrincipleValues,
  confirmedAt: Date,
): ConfirmedUserPrinciples {
  const normalized = normalizePrincipleValues(values);
  const missing = unresolvedRequiredFields(normalized);

  if (missing.length > 0) {
    throw new Error(
      `확정할 수 없습니다. 남은 항목: ${missing
        .map((field) => PRINCIPLE_FIELD_LABELS[field])
        .join(", ")}`,
    );
  }

  return ConfirmedUserPrinciplesSchema.parse({
    ...normalized,
    confirmation: "CONFIRMED",
    confirmedAt: confirmedAt.toISOString(),
  });
}
