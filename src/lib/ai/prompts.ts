import { PRINCIPLE_FIELDS } from "@/lib/domain/schemas";
import { PRODUCT_TERM_FIELDS } from "@/lib/domain/schemas";

/**
 * AI 호출에 사용하는 지시문과 JSON Schema.
 *
 * AI 의 역할은 텍스트 구조화와 근거 후보 제시로만 제한한다.
 * 상품 추천, 적합성·안전성 판단, 수익률 예측은 금지한다.
 */

const COMMON_RULES = `너는 금융 문서를 구조화하는 도구다.
반드시 지켜야 할 규칙:
- 주어진 텍스트에 명시적으로 없는 내용은 절대로 만들어 내지 않는다.
- 상품 추천, 적합성 판단, 안전성 판단, 가입 여부 판단, 수익률이나 손실률 예측을 하지 않는다.
- 확실하지 않으면 값을 채우지 말고 비워 둔다. 추측은 오류로 취급한다.
- 지정된 JSON 스키마 외의 어떤 텍스트도 출력하지 않는다.`;

/* ------------------------------------------------------------------ */
/* 1) 금융 원칙 구조화                                                 */
/* ------------------------------------------------------------------ */

export const STRUCTURE_PRINCIPLES_INSTRUCTION = `${COMMON_RULES}

이번 작업은 사용자가 한국어로 적은 자금 상황을 아래 항목으로 구조화하는 것이다.

- purpose: 자금의 목적. 예: 전세자금, 결혼자금, 여유자금
- useWithinMonths: 이 자금을 사용할 시점까지의 개월 수. "1년 뒤"는 12.
- principalLossAllowed: 원금 손실을 허용하는지. 손실을 원하지 않는다고 하면 false.
- maxLossPercent: 감당할 수 있는 최대 손실률(%). "최대 10%"는 10.
- earlyWithdrawalRequired: 만기 전에 자금을 찾을 수 있어야 하는지.
- earlyWithdrawalPrincipalLossAllowed: 중도에 찾을 때 원금 손실을 허용하는지.
- depositProtectionRequired: 예금자보호 대상이어야 하는지.

사용자가 말하지 않은 항목은 필드를 아예 포함하지 않는다.
값을 넣을 수 없는 항목마다 clarifications 배열에 확인 질문을 하나씩 넣는다.
질문은 한국어 존댓말 한 문장이며, 금융 용어를 모르는 사람도 답할 수 있어야 한다.`;

export const STRUCTURE_PRINCIPLES_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    purpose: { type: "string", description: "자금 목적" },
    useWithinMonths: { type: "integer", minimum: 1, maximum: 600 },
    principalLossAllowed: { type: "boolean" },
    maxLossPercent: { type: "number", minimum: 0, maximum: 100 },
    earlyWithdrawalRequired: { type: "boolean" },
    earlyWithdrawalPrincipalLossAllowed: { type: "boolean" },
    depositProtectionRequired: { type: "boolean" },
    clarifications: {
      type: "array",
      description: "입력만으로 확인할 수 없는 항목의 확인 질문",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: [...PRINCIPLE_FIELDS] },
          question: { type: "string" },
        },
        required: ["field", "question"],
        additionalProperties: false,
        propertyOrdering: ["field", "question"],
      },
    },
  },
  required: ["clarifications"],
  additionalProperties: false,
  propertyOrdering: [
    ...PRINCIPLE_FIELDS,
    "clarifications",
  ],
};

export function buildStructurePrinciplesPrompt(input: string): string {
  return `다음 문장을 구조화하라.\n\n"""\n${input}\n"""`;
}

/* ------------------------------------------------------------------ */
/* 2) 상품 조건 추출                                                   */
/* ------------------------------------------------------------------ */

export const EXTRACT_TERMS_INSTRUCTION = `${COMMON_RULES}

이번 작업은 상품설명서의 페이지별 텍스트에서 아래 여섯 조건을 찾는 것이다.

- principalLossPossible: 원금 손실이 발생할 수 있는지 (boolean)
- maxLossPercent: 문서가 명시한 최대 손실률 (number, 0~100)
- maturityMonths: 상품 만기까지의 개월 수 (integer)
- earlyRedemptionAllowed: 중도환매가 가능한지 (boolean)
- earlyRedemptionLossPossible: 중도환매 시 원금 손실이 발생할 수 있는지 (boolean)
- depositProtected: 예금자보호 대상인지 (boolean)

각 조건마다 다음을 지킨다.
- 문서에 명시된 조건만 conditions 배열에 넣는다. 문서에 없으면 그 항목을 아예 넣지 않는다.
- quote 는 해당 내용을 담은 문장을 문서에서 **글자 그대로** 옮긴다. 요약하거나 다듬지 않는다.
- page 는 그 문장이 실제로 있는 페이지 번호다.
- 원금 손실 가능성만 적혀 있고 최대 손실률이 없으면 maxLossPercent 는 넣지 않는다.
  일반적인 위험도나 시장 상황으로 손실률을 추정하지 않는다.
- boolean 조건에는 booleanValue 를, 숫자 조건에는 numberValue 를 넣는다.

quote 가 문서와 한 글자라도 다르면 그 조건은 폐기되므로 정확히 옮겨야 한다.`;

export const EXTRACT_TERMS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    conditions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: [...PRODUCT_TERM_FIELDS] },
          booleanValue: { type: "boolean" },
          numberValue: { type: "number" },
          quote: { type: "string", description: "문서 원문 그대로" },
          page: { type: "integer", minimum: 1 },
        },
        required: ["field", "quote", "page"],
        additionalProperties: false,
        propertyOrdering: ["field", "booleanValue", "numberValue", "quote", "page"],
      },
    },
  },
  required: ["conditions"],
  additionalProperties: false,
  propertyOrdering: ["conditions"],
};

export function buildExtractTermsPrompt(
  metadata: { productName: string; documentType: string; issuedAt: string },
  pages: readonly { page: number; text: string }[],
): string {
  const body = pages
    .map((page) => `--- ${page.page}페이지 ---\n${page.text}`)
    .join("\n\n");

  return `상품명: ${metadata.productName}
문서 종류: ${metadata.documentType}
작성일: ${metadata.issuedAt}

아래는 이 문서의 페이지별 텍스트다.

${body}`;
}
