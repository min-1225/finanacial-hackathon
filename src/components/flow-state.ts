export type FlowStep =
  | "INPUT"
  | "CLARIFYING"
  | "CONFIRMING"
  | "PRODUCT_SELECTION"
  | "ANALYZING"
  | "RESULT";

export type FlowErrorKind =
  | "AI_ERROR"
  | "DOCUMENT_INCOMPLETE"
  | "EVIDENCE_UNVERIFIED"
  | "UNKNOWN_ERROR";

export type FlowError = { kind: FlowErrorKind; message: string };

export const ANALYSIS_STAGES = [
  "문서 상태 확인",
  "상품 조건 추출",
  "원문·페이지 검증",
  "금융 원칙 대조",
] as const;

export type AnalysisStageState = "pending" | "running" | "done" | "failed";
