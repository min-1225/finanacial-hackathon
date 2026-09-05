import { z } from "zod";
import { PrincipleFieldSchema } from "@/lib/domain/schemas";
import type { PrincipleField, UserPrinciplesDraft } from "@/lib/domain/types";
import {
  EMPTY_PRINCIPLE_VALUES,
  buildClarificationQuestions,
  normalizePrincipleValues,
} from "@/lib/domain/principles";
import { requestStructuredJson } from "./client";
import {
  STRUCTURE_PRINCIPLES_INSTRUCTION,
  STRUCTURE_PRINCIPLES_SCHEMA,
  buildStructurePrinciplesPrompt,
} from "./prompts";

/** AI 응답이 스키마와 다를 때 던진다. 재시도하지 않고 422 로 매핑한다. */
export class AiSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiSchemaError";
  }
}

/**
 * AI 는 입력에서 확인한 항목만 돌려준다.
 * 확인하지 못한 항목은 필드를 아예 포함하지 않는다.
 */
const AiPrinciplesResponseSchema = z.strictObject({
  purpose: z.string().min(1).max(100).optional(),
  useWithinMonths: z.number().int().min(1).max(600).optional(),
  principalLossAllowed: z.boolean().optional(),
  maxLossPercent: z.number().min(0).max(100).optional(),
  earlyWithdrawalRequired: z.boolean().optional(),
  earlyWithdrawalPrincipalLossAllowed: z.boolean().optional(),
  depositProtectionRequired: z.boolean().optional(),
  clarifications: z
    .array(
      z.strictObject({
        field: PrincipleFieldSchema,
        question: z.string().min(1).max(200),
      }),
    )
    .max(7),
});

export function toDraft(raw: unknown): UserPrinciplesDraft {
  const parsed = AiPrinciplesResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiSchemaError("구조화 응답이 스키마와 다릅니다.");
  }

  const { clarifications, ...found } = parsed.data;

  // AI 가 준 값 중 실제로 존재하는 것만 반영한다. 나머지는 null 로 남는다.
  const values = normalizePrincipleValues({ ...EMPTY_PRINCIPLE_VALUES, ...found });

  const questionText: Partial<Record<PrincipleField, string>> = {};
  for (const item of clarifications) {
    questionText[item.field] = item.question;
  }

  // 질문 목록은 항상 프로젝트가 계산한 미확정 항목 기준으로 다시 만든다.
  // AI 가 엉뚱한 항목을 묻거나 필요한 질문을 빠뜨려도 화면이 어긋나지 않는다.
  return { ...values, clarificationQuestions: buildClarificationQuestions(values, questionText) };
}

export async function structurePrinciples(input: string): Promise<UserPrinciplesDraft> {
  const raw = await requestStructuredJson({
    systemInstruction: STRUCTURE_PRINCIPLES_INSTRUCTION,
    prompt: buildStructurePrinciplesPrompt(input),
    schema: STRUCTURE_PRINCIPLES_SCHEMA,
  });

  return toDraft(raw);
}
