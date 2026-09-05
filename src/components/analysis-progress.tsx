"use client";

import { AlertTriangle, Check, Circle, Loader2, RotateCcw } from "lucide-react";
import { ANALYSIS_STAGES, type AnalysisStageState, type FlowError } from "./flow-state";
import { CARD, Notice, PRIMARY_BUTTON, SECONDARY_BUTTON, SectionTitle } from "./ui";

const STAGE_ICON: Record<AnalysisStageState, React.ReactNode> = {
  pending: <Circle aria-hidden className="h-4 w-4 text-zinc-300" />,
  running: <Loader2 aria-hidden className="h-4 w-4 animate-spin text-zinc-900" />,
  done: <Check aria-hidden className="h-4 w-4 text-emerald-600" />,
  failed: <AlertTriangle aria-hidden className="h-4 w-4 text-red-600" />,
};

const STAGE_LABEL: Record<AnalysisStageState, string> = {
  pending: "대기",
  running: "진행 중",
  done: "완료",
  failed: "중단",
};

export function AnalysisProgress({
  stages,
  error,
  onRetry,
  onBack,
}: {
  stages: AnalysisStageState[];
  error: FlowError | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <section className={CARD}>
      <SectionTitle
        step="5단계"
        title="상품 문서를 확인하는 중입니다"
        description="문서 상태를 먼저 검사하고, 추출한 조건의 원문과 페이지를 다시 확인한 뒤에 원칙과 대조합니다."
      />

      <ol className="grid gap-2" aria-live="polite">
        {ANALYSIS_STAGES.map((stage, index) => {
          const state = stages[index] ?? "pending";
          return (
            <li
              key={stage}
              className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3"
            >
              <span className="flex items-center gap-3 text-sm text-zinc-800">
                {STAGE_ICON[state]}
                {stage}
              </span>
              <span className="text-xs text-muted">{STAGE_LABEL[state]}</span>
            </li>
          );
        })}
      </ol>

      {error ? (
        <div className="mt-5 grid gap-4" role="alert">
          <Notice tone={error.kind === "DOCUMENT_INCOMPLETE" ? "warning" : "danger"}>
            {error.message}
          </Notice>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={SECONDARY_BUTTON} onClick={onBack}>
              다른 상품 선택
            </button>
            {error.kind !== "DOCUMENT_INCOMPLETE" ? (
              <button type="button" className={PRIMARY_BUTTON} onClick={onRetry}>
                <RotateCcw aria-hidden className="h-4 w-4" />
                다시 분석
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
