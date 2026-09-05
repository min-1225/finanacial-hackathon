import type { UserPrinciplesDraft, UserPrincipleValues } from "@/lib/domain/types";
import {
  EMPTY_PRINCIPLE_VALUES,
  buildClarificationQuestions,
  normalizePrincipleValues,
} from "@/lib/domain/principles";

/**
 * fixture 모드용 금융 원칙 구조화.
 *
 * 실제 AI 호출을 대신하는 고정 데이터다.
 * 3단계에서 /api/principles/structure 로 교체한다.
 */

export const DEMO_INPUTS = [
  {
    id: "scenario-1",
    label: "시나리오 1 · 전세자금",
    text: "1년 뒤 전세자금으로 사용할 돈이고 원금 손실은 원하지 않습니다. 필요하면 중간에 돈을 찾을 수 있어야 합니다.",
  },
  {
    id: "scenario-2",
    label: "시나리오 2 · 최대 10% 손실 허용",
    text: "당장 사용할 돈은 아니고 투자할 수 있습니다. 다만 손실은 최대 10%까지만 감당하고 싶습니다.",
  },
] as const;

const SCENARIO_VALUES: { match: RegExp; values: Partial<UserPrincipleValues> }[] = [
  {
    match: /전세/,
    values: {
      purpose: "전세자금",
      useWithinMonths: 12,
      principalLossAllowed: false,
      earlyWithdrawalRequired: true,
      // 예금자보호 필요 여부는 입력에 없으므로 비워 두고 추가 질문한다.
      depositProtectionRequired: null,
    },
  },
  {
    match: /10\s*%/,
    values: {
      purpose: "여유자금 투자",
      useWithinMonths: 36,
      principalLossAllowed: true,
      maxLossPercent: 10,
      earlyWithdrawalRequired: false,
      depositProtectionRequired: false,
    },
  },
];

export function structurePrinciplesFixture(input: string): UserPrinciplesDraft {
  const matched = SCENARIO_VALUES.find((entry) => entry.match.test(input));
  const values = normalizePrincipleValues({
    ...EMPTY_PRINCIPLE_VALUES,
    ...(matched?.values ?? {}),
  });

  return { ...values, clarificationQuestions: buildClarificationQuestions(values) };
}
