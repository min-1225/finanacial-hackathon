import { z } from "zod";

/**
 * SecondSign 도메인 스키마.
 *
 * 모든 객체 스키마는 strict 모드로 정의한다.
 * 알 수 없는 추가 필드가 들어오면 거부해서 AI 응답과 외부 입력이
 * 도메인 타입을 조용히 넓히지 못하게 한다.
 */

/* ------------------------------------------------------------------ */
/* 금융 원칙 키                                                        */
/* ------------------------------------------------------------------ */

export const PRINCIPLE_KEYS = [
  "principalLoss",
  "lossLimit",
  "liquidityHorizon",
  "earlyRedemption",
  "depositProtection",
] as const;

export const PrincipleKeySchema = z.enum(PRINCIPLE_KEYS);

/* ------------------------------------------------------------------ */
/* 금융 원칙 초안                                                      */
/* ------------------------------------------------------------------ */

export const PRINCIPLE_FIELDS = [
  "purpose",
  "useWithinMonths",
  "principalLossAllowed",
  "maxLossPercent",
  "earlyWithdrawalRequired",
  "earlyWithdrawalPrincipalLossAllowed",
  "depositProtectionRequired",
] as const;

export const PrincipleFieldSchema = z.enum(PRINCIPLE_FIELDS);

export const ClarificationOptionSchema = z.strictObject({
  /** 화면에 표시할 문구 */
  label: z.string().min(1).max(60),
  /** 필드에 적용할 값. boolean 은 "true"/"false", 숫자는 십진수 문자열로 표현한다. */
  value: z.string().min(1).max(20),
});

export const ClarificationQuestionSchema = z.strictObject({
  field: PrincipleFieldSchema,
  question: z.string().min(1).max(200),
  options: z.array(ClarificationOptionSchema).min(2).max(6),
});

export const UserPrincipleValuesSchema = z.strictObject({
  /** 자금 목적. 판정에는 쓰지 않고 사용자 확인용으로만 표시한다. */
  purpose: z.string().min(1).max(100).nullable(),
  /** 자금 사용 예정 시점(개월). */
  useWithinMonths: z.number().int().min(1).max(600).nullable(),
  /** 원금손실 허용 여부. */
  principalLossAllowed: z.boolean().nullable(),
  /** 허용 손실 한도(%). */
  maxLossPercent: z.number().min(0).max(100).nullable(),
  /** 중도인출 필요 여부. */
  earlyWithdrawalRequired: z.boolean().nullable(),
  /** 중도인출 시 원금손실 허용 여부. */
  earlyWithdrawalPrincipalLossAllowed: z.boolean().nullable(),
  /** 예금자보호 필요 여부. */
  depositProtectionRequired: z.boolean().nullable(),
});

export const UserPrinciplesDraftSchema = z.strictObject({
  ...UserPrincipleValuesSchema.shape,
  clarificationQuestions: z.array(ClarificationQuestionSchema).max(7),
});

export const ConfirmedUserPrinciplesSchema = z.strictObject({
  ...UserPrincipleValuesSchema.shape,
  /** 사용자 확인 액션으로만 생성한다. AI 응답 스키마에는 존재하지 않는다. */
  confirmation: z.literal("CONFIRMED"),
  confirmedAt: z.iso.datetime(),
});

/* ------------------------------------------------------------------ */
/* 상품 조건과 근거                                                    */
/* ------------------------------------------------------------------ */

/** AI 가 제시한 근거 후보. verified 필드가 없다. */
export const EvidenceCandidateSchema = z.strictObject({
  quote: z.string().min(1).max(1000),
  page: z.number().int().positive(),
});

/** 프로젝트 코드가 재검증을 마친 근거. */
export const EvidenceSchema = z.strictObject({
  quote: z.string().min(1).max(1000),
  page: z.number().int().positive(),
  verified: z.boolean(),
});

/** 값이 있는데 근거가 없는 구조는 거부한다. */
const MISSING_EVIDENCE_MESSAGE =
  "상품 조건 값이 있으면 근거가 반드시 있어야 합니다.";

function productConditionCandidate<T>(value: z.ZodType<T>) {
  return z
    .strictObject({
      value: value.nullable(),
      evidence: EvidenceCandidateSchema.nullable(),
    })
    .superRefine((condition, ctx) => {
      if (condition.value !== null && condition.evidence === null) {
        ctx.addIssue({
          code: "custom",
          message: MISSING_EVIDENCE_MESSAGE,
          path: ["evidence"],
        });
      }
    });
}

function productCondition<T>(value: z.ZodType<T>) {
  return z
    .strictObject({
      value: value.nullable(),
      evidence: EvidenceSchema.nullable(),
    })
    .superRefine((condition, ctx) => {
      if (condition.value !== null && condition.evidence === null) {
        ctx.addIssue({
          code: "custom",
          message: MISSING_EVIDENCE_MESSAGE,
          path: ["evidence"],
        });
      }
    });
}

const PercentSchema = z.number().min(0).max(100);
const MonthsSchema = z.number().int().min(1).max(600);

/** AI 추출 직후의 상품 조건. 모든 근거는 아직 미확인 상태다. */
export const ProductTermsCandidateSchema = z.strictObject({
  principalLossPossible: productConditionCandidate(z.boolean()),
  maxLossPercent: productConditionCandidate(PercentSchema),
  maturityMonths: productConditionCandidate(MonthsSchema),
  earlyRedemptionAllowed: productConditionCandidate(z.boolean()),
  earlyRedemptionLossPossible: productConditionCandidate(z.boolean()),
  depositProtected: productConditionCandidate(z.boolean()),
});

/** 근거 재검증을 마친 상품 조건. 규칙 엔진의 입력이다. */
export const ProductTermsSchema = z.strictObject({
  principalLossPossible: productCondition(z.boolean()),
  maxLossPercent: productCondition(PercentSchema),
  maturityMonths: productCondition(MonthsSchema),
  earlyRedemptionAllowed: productCondition(z.boolean()),
  earlyRedemptionLossPossible: productCondition(z.boolean()),
  depositProtected: productCondition(z.boolean()),
});

export const PRODUCT_TERM_FIELDS = Object.keys(
  ProductTermsSchema.shape,
) as (keyof z.infer<typeof ProductTermsSchema>)[];

/* ------------------------------------------------------------------ */
/* 문서 상태                                                           */
/* ------------------------------------------------------------------ */

export const ProductPageSchema = z.strictObject({
  page: z.number().int().positive(),
  text: z.string().min(1),
});

export const ProductManifestSchema = z.strictObject({
  productId: z.string().min(1).max(64),
  productName: z.string().min(1).max(120),
  documentType: z.string().min(1).max(60),
  issuedAt: z.string().min(1).max(20),
  expectedPageCount: z.number().int().positive().max(200),
  /** 데모 목록에 보여줄 한 줄 설명 */
  summary: z.string().min(1).max(200),
  pdfPath: z.string().min(1).max(200),
});

export const DocumentStatusSchema = z.strictObject({
  productId: z.string().min(1),
  productName: z.string().min(1),
  documentType: z.string().min(1),
  issuedAt: z.string().min(1),
  expectedPageCount: z.number().int().positive(),
  availablePages: z.array(z.number().int().positive()),
  missingPages: z.array(z.number().int().positive()),
  complete: z.boolean(),
});

/* ------------------------------------------------------------------ */
/* 검증 결과                                                           */
/* ------------------------------------------------------------------ */

export const RuleStatusSchema = z.enum([
  "VIOLATION",
  "HOLD",
  "CONDITION_CONFIRMED",
]);

export const RuleResultSchema = z
  .strictObject({
    principle: PrincipleKeySchema,
    status: RuleStatusSchema,
    summary: z.string().min(1).max(400),
    evidence: z.array(EvidenceSchema),
  })
  .superRefine((result, ctx) => {
    if (result.evidence.some((item) => !item.verified)) {
      ctx.addIssue({
        code: "custom",
        message: "검증 결과에는 확인된 근거만 포함할 수 있습니다.",
        path: ["evidence"],
      });
    }
    if (result.status !== "HOLD" && result.evidence.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "보류가 아닌 결과에는 근거가 하나 이상 있어야 합니다.",
        path: ["evidence"],
      });
    }
  });

export const RuleResultListSchema = z
  .array(RuleResultSchema)
  .superRefine((results, ctx) => {
    const seen = results.map((result) => result.principle);
    for (const key of PRINCIPLE_KEYS) {
      if (seen.filter((item) => item === key).length !== 1) {
        ctx.addIssue({
          code: "custom",
          message: `원칙 ${key} 는 결과에 정확히 한 번 포함되어야 합니다.`,
        });
      }
    }
  });

/* ------------------------------------------------------------------ */
/* API 계약                                                            */
/* ------------------------------------------------------------------ */

export const StructurePrinciplesRequestSchema = z.strictObject({
  input: z.string().trim().min(5).max(1000),
});

export const StructurePrinciplesResponseSchema = z.strictObject({
  draft: UserPrinciplesDraftSchema,
  fixture: z.boolean(),
});

export const AnalyzeProductResponseSchema = z.strictObject({
  status: DocumentStatusSchema,
  terms: ProductTermsSchema,
  fixture: z.boolean(),
});
