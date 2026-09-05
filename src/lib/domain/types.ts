import type { z } from "zod";
import type {
  AnalyzeProductResponseSchema,
  ClarificationQuestionSchema,
  ConfirmedUserPrinciplesSchema,
  DocumentStatusSchema,
  EvidenceCandidateSchema,
  EvidenceSchema,
  PrincipleFieldSchema,
  PrincipleKeySchema,
  ProductManifestSchema,
  ProductPageSchema,
  ProductTermsCandidateSchema,
  ProductTermsSchema,
  RuleResultSchema,
  RuleStatusSchema,
  StructurePrinciplesResponseSchema,
  UserPrincipleValuesSchema,
  UserPrinciplesDraftSchema,
} from "./schemas";

export type PrincipleKey = z.infer<typeof PrincipleKeySchema>;
export type PrincipleField = z.infer<typeof PrincipleFieldSchema>;
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;
export type UserPrincipleValues = z.infer<typeof UserPrincipleValuesSchema>;
export type UserPrinciplesDraft = z.infer<typeof UserPrinciplesDraftSchema>;
export type ConfirmedUserPrinciples = z.infer<
  typeof ConfirmedUserPrinciplesSchema
>;

export type EvidenceCandidate = z.infer<typeof EvidenceCandidateSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;

export type ProductConditionCandidate<T> = {
  value: T | null;
  evidence: EvidenceCandidate | null;
};

export type ProductCondition<T> = {
  value: T | null;
  evidence: Evidence | null;
};

export type ProductTermsCandidate = z.infer<typeof ProductTermsCandidateSchema>;
export type ProductTerms = z.infer<typeof ProductTermsSchema>;
export type ProductTermField = keyof ProductTerms;

export type ProductPage = z.infer<typeof ProductPageSchema>;
export type ProductManifest = z.infer<typeof ProductManifestSchema>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export type RuleStatus = z.infer<typeof RuleStatusSchema>;
export type RuleResult = z.infer<typeof RuleResultSchema>;

export type StructurePrinciplesResponse = z.infer<
  typeof StructurePrinciplesResponseSchema
>;
export type AnalyzeProductResponse = z.infer<
  typeof AnalyzeProductResponseSchema
>;
