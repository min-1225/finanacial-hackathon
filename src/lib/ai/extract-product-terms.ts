import { z } from "zod";
import { ProductTermsCandidateSchema } from "@/lib/domain/schemas";
import type {
  ProductManifest,
  ProductPage,
  ProductTermsCandidate,
} from "@/lib/domain/types";
import { requestStructuredJson } from "./client";
import {
  EXTRACT_TERMS_INSTRUCTION,
  EXTRACT_TERMS_SCHEMA,
  buildExtractTermsPrompt,
} from "./prompts";
import { AiSchemaError } from "./structure-principles";

const BOOLEAN_FIELDS = [
  "principalLossPossible",
  "earlyRedemptionAllowed",
  "earlyRedemptionLossPossible",
  "depositProtected",
] as const;

const NUMBER_FIELDS = ["maxLossPercent", "maturityMonths"] as const;

const TermFieldSchema = z.enum([...BOOLEAN_FIELDS, ...NUMBER_FIELDS]);

const AiTermsResponseSchema = z.strictObject({
  conditions: z
    .array(
      z.strictObject({
        field: TermFieldSchema,
        booleanValue: z.boolean().optional(),
        numberValue: z.number().optional(),
        quote: z.string().min(1).max(1000),
        page: z.number().int().positive(),
      }),
    )
    .max(12),
});

const EMPTY_CANDIDATE: ProductTermsCandidate = {
  principalLossPossible: { value: null, evidence: null },
  maxLossPercent: { value: null, evidence: null },
  maturityMonths: { value: null, evidence: null },
  earlyRedemptionAllowed: { value: null, evidence: null },
  earlyRedemptionLossPossible: { value: null, evidence: null },
  depositProtected: { value: null, evidence: null },
};

export function toCandidate(raw: unknown): ProductTermsCandidate {
  const parsed = AiTermsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiSchemaError("상품 조건 추출 응답이 스키마와 다릅니다.");
  }

  const candidate: ProductTermsCandidate = structuredClone(EMPTY_CANDIDATE);

  const target = candidate as Record<string, { value: unknown; evidence: unknown }>;

  for (const item of parsed.data.conditions) {
    const evidence = { quote: item.quote, page: item.page };

    if ((BOOLEAN_FIELDS as readonly string[]).includes(item.field)) {
      // 필드 타입에 맞는 값이 없으면 추출하지 못한 것으로 본다.
      if (item.booleanValue === undefined) continue;
      target[item.field] = { value: item.booleanValue, evidence };
      continue;
    }

    const value = item.numberValue;
    if (value === undefined) continue;
    if (item.field === "maxLossPercent" && (value < 0 || value > 100)) continue;
    if (item.field === "maturityMonths" && (!Number.isInteger(value) || value < 1)) {
      continue;
    }
    target[item.field] = { value, evidence };
  }

  const validated = ProductTermsCandidateSchema.safeParse(candidate);
  if (!validated.success) {
    throw new AiSchemaError("상품 조건 후보 구조가 올바르지 않습니다.");
  }

  return validated.data;
}

export async function extractProductTerms(
  manifest: ProductManifest,
  pages: readonly ProductPage[],
): Promise<ProductTermsCandidate> {
  const raw = await requestStructuredJson({
    systemInstruction: EXTRACT_TERMS_INSTRUCTION,
    prompt: buildExtractTermsPrompt(manifest, pages),
    schema: EXTRACT_TERMS_SCHEMA,
  });

  return toCandidate(raw);
}
