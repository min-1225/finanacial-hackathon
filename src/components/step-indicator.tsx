import type { FlowStep } from "@/components/flow-state";

const STEPS: { key: FlowStep; label: string }[] = [
  { key: "INPUT", label: "원칙 입력" },
  { key: "CLARIFYING", label: "추가 확인" },
  { key: "CONFIRMING", label: "원칙 확정" },
  { key: "PRODUCT_SELECTION", label: "상품 선택" },
  { key: "ANALYZING", label: "문서 분석" },
  { key: "RESULT", label: "검증 결과" },
];

export function StepIndicator({ current }: { current: FlowStep }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
      {STEPS.map((step, index) => {
        const state =
          index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={
                state === "current"
                  ? "rounded-full bg-zinc-900 px-3 py-1 text-white"
                  : state === "done"
                    ? "rounded-full bg-zinc-200 px-3 py-1 text-zinc-700"
                    : "rounded-full px-3 py-1 text-zinc-400"
              }
              aria-current={state === "current" ? "step" : undefined}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden className="text-zinc-300">
                ›
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
