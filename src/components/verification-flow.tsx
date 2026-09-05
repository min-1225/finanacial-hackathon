"use client";

import { useCallback, useState } from "react";
import type {
  ConfirmedUserPrinciples,
  DocumentStatus,
  PrincipleField,
  ProductManifest,
  ProductTerms,
  RuleResult,
  UserPrincipleValues,
} from "@/lib/domain/types";
import {
  AnalyzeProductResponseSchema,
  StructurePrinciplesResponseSchema,
} from "@/lib/domain/schemas";
import {
  EMPTY_PRINCIPLE_VALUES,
  applyClarificationAnswer,
  buildClarificationQuestions,
  confirmPrinciples,
} from "@/lib/domain/principles";
import { evaluateRules } from "@/lib/rules/evaluate-rules";
import {
  ANALYSIS_STAGES,
  type AnalysisStageState,
  type FlowError,
  type FlowStep,
} from "./flow-state";
import { AnalysisProgress } from "./analysis-progress";
import { ClarificationForm } from "./clarification-form";
import { PrincipleConfirmation } from "./principle-confirmation";
import { PrincipleInput } from "./principle-input";
import { ProductSelector } from "./product-selector";
import { StepIndicator } from "./step-indicator";
import { VerificationResult } from "./verification-result";
import { Notice, SECONDARY_BUTTON } from "./ui";

const IDLE_STAGES: AnalysisStageState[] = ANALYSIS_STAGES.map(() => "pending");

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 서버가 준 사용자용 문구를 쓰고, 없으면 상태 코드별 기본 문구를 쓴다. */
async function readError(response: Response, fallback: string): Promise<FlowError> {
  let message = fallback;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.length > 0) {
      message = body.error;
    }
  } catch {
    // 본문이 없거나 JSON 이 아니면 기본 문구를 쓴다.
  }

  if (response.status === 500) {
    return {
      kind: "UNKNOWN_ERROR",
      message: `${message} 환경변수 설정을 확인하거나 잠시 후 다시 시도해 주세요.`,
    };
  }
  return { kind: "AI_ERROR", message };
}

export function VerificationFlow({ products }: { products: ProductManifest[] }) {
  const [step, setStep] = useState<FlowStep>("INPUT");
  const [values, setValues] = useState<UserPrincipleValues>(EMPTY_PRINCIPLE_VALUES);
  const [confirmed, setConfirmed] = useState<ConfirmedUserPrinciples | null>(null);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [terms, setTerms] = useState<ProductTerms | null>(null);
  const [results, setResults] = useState<RuleResult[]>([]);
  const [stages, setStages] = useState<AnalysisStageState[]>(IDLE_STAGES);
  const [error, setError] = useState<FlowError | null>(null);
  const [pending, setPending] = useState(false);
  const [lastProductId, setLastProductId] = useState<string | null>(null);
  const [fixtureMode, setFixtureMode] = useState(false);

  const questions = buildClarificationQuestions(values);

  const reset = useCallback(() => {
    setStep("INPUT");
    setValues(EMPTY_PRINCIPLE_VALUES);
    setConfirmed(null);
    setDocumentStatus(null);
    setTerms(null);
    setResults([]);
    setStages(IDLE_STAGES);
    setError(null);
    setLastProductId(null);
  }, []);

  const structure = useCallback(async (input: string) => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/principles/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        setError(
          await readError(
            response,
            "입력을 정리하지 못했습니다. 문장을 조금 더 구체적으로 적고 다시 시도해 주세요.",
          ),
        );
        return;
      }

      const parsed = StructurePrinciplesResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        setError({
          kind: "AI_ERROR",
          message: "정리 결과의 형식이 올바르지 않아 사용하지 않았습니다. 다시 시도해 주세요.",
        });
        return;
      }

      const { clarificationQuestions: _questions, ...draftValues } = parsed.data.draft;
      setFixtureMode(parsed.data.fixture);
      setValues(draftValues);
      setStep(
        buildClarificationQuestions(draftValues).length > 0 ? "CLARIFYING" : "CONFIRMING",
      );
    } catch {
      setError({
        kind: "UNKNOWN_ERROR",
        message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setPending(false);
    }
  }, []);

  const answer = useCallback((field: PrincipleField, value: string) => {
    setValues((previous) => {
      const next = applyClarificationAnswer(previous, field, value);
      setStep(buildClarificationQuestions(next).length > 0 ? "CLARIFYING" : "CONFIRMING");
      return next;
    });
  }, []);

  const confirm = useCallback(() => {
    try {
      setConfirmed(confirmPrinciples(values, new Date()));
      setError(null);
      setStep("PRODUCT_SELECTION");
    } catch {
      setError({
        kind: "UNKNOWN_ERROR",
        message: "아직 비어 있는 항목이 있어 확정할 수 없습니다.",
      });
    }
  }, [values]);

  const analyze = useCallback(
    async (productId: string, principles: ConfirmedUserPrinciples) => {
      setLastProductId(productId);
      setStep("ANALYZING");
      setError(null);
      setStages(["running", "pending", "pending", "pending"]);

      try {
        const response = await fetch(`/api/products/${productId}/analyze`, {
          method: "POST",
        });

        if (response.status === 409) {
          setStages(["failed", "pending", "pending", "pending"]);
          const body = (await response.json()) as { status?: DocumentStatus };
          const missing = body.status?.missingPages ?? [];
          setError({
            kind: "DOCUMENT_INCOMPLETE",
            message: `문서에 누락된 페이지가 있습니다(${missing.join(", ")}페이지). 필요한 조건을 확인할 수 없어 상품 검증을 진행하지 않습니다.`,
          });
          return;
        }

        if (!response.ok) {
          setStages(["failed", "pending", "pending", "pending"]);
          setError(
            await readError(response, "상품 문서를 분석하지 못했습니다. 다시 시도해 주세요."),
          );
          return;
        }

        const parsed = AnalyzeProductResponseSchema.safeParse(await response.json());
        if (!parsed.success) {
          setStages(["done", "failed", "pending", "pending"]);
          setError({
            kind: "AI_ERROR",
            message: "분석 결과의 형식이 올바르지 않아 사용하지 않았습니다.",
          });
          return;
        }

        setFixtureMode(parsed.data.fixture);
        setDocumentStatus(parsed.data.status);
        setTerms(parsed.data.terms);

        setStages(["done", "running", "pending", "pending"]);
        await delay(320);
        setStages(["done", "done", "running", "pending"]);
        await delay(320);
        setStages(["done", "done", "done", "running"]);

        setResults(evaluateRules(principles, parsed.data.terms));
        setStages(["done", "done", "done", "done"]);
        await delay(220);
        setStep("RESULT");
      } catch {
        setStages(["failed", "pending", "pending", "pending"]);
        setError({
          kind: "UNKNOWN_ERROR",
          message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      }
    },
    [],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">SecondSign</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          내가 확정한 금융 원칙과 상품설명서에서 근거가 확인된 조건만 대조합니다.
        </p>
        <div className="mt-5">
          <StepIndicator current={step} />
        </div>
      </header>

      {fixtureMode ? (
        <div className="mb-5">
          <Notice tone="warning">
            현재 샘플(fixture) 모드로 동작 중입니다. 화면의 구조화·추출 결과는 고정된
            샘플 데이터이며 실시간 AI 응답이 아닙니다.
          </Notice>
        </div>
      ) : null}

      {step === "INPUT" ? (
        <div className="grid gap-4">
          {error ? (
            <div role="alert">
              <Notice tone="danger">{error.message}</Notice>
            </div>
          ) : null}
          <PrincipleInput pending={pending} onSubmit={structure} />
        </div>
      ) : null}

      {step === "CLARIFYING" ? (
        <ClarificationForm questions={questions} onAnswer={answer} />
      ) : null}

      {step === "CONFIRMING" ? (
        <div className="grid gap-4">
          {error ? (
            <div role="alert">
              <Notice tone="danger">{error.message}</Notice>
            </div>
          ) : null}
          <PrincipleConfirmation
            values={values}
            onChange={setValues}
            onConfirm={confirm}
          />
        </div>
      ) : null}

      {step === "PRODUCT_SELECTION" && confirmed ? (
        <ProductSelector
          products={products}
          onSelect={(productId) => void analyze(productId, confirmed)}
        />
      ) : null}

      {step === "ANALYZING" ? (
        <AnalysisProgress
          stages={stages}
          error={error}
          onRetry={() => {
            if (lastProductId && confirmed) void analyze(lastProductId, confirmed);
          }}
          onBack={() => {
            setError(null);
            setStages(IDLE_STAGES);
            setStep("PRODUCT_SELECTION");
          }}
        />
      ) : null}

      {step === "RESULT" ? (
        confirmed && documentStatus && terms && results.length > 0 ? (
          <VerificationResult
            principles={confirmed}
            documentStatus={documentStatus}
            terms={terms}
            results={results}
            onRestart={reset}
          />
        ) : (
          <div className="grid gap-4" role="alert">
            <Notice tone="danger">
              검증 결과를 불러오지 못했습니다. 처음부터 다시 시도해 주세요.
            </Notice>
            <div>
              <button type="button" className={SECONDARY_BUTTON} onClick={reset}>
                처음부터 다시 하기
              </button>
            </div>
          </div>
        )
      ) : null}

      {step !== "INPUT" && step !== "RESULT" ? (
        <div className="mt-6 flex justify-start">
          <button type="button" className={SECONDARY_BUTTON} onClick={reset}>
            처음부터 다시 하기
          </button>
        </div>
      ) : null}

      <footer className="mt-12 border-t border-line pt-5 text-xs leading-6 text-muted">
        SecondSign은 금융상품 추천, 적합성 판단, 수익률 예측을 제공하지 않습니다. 샘플
        상품설명서는 모두 데모용 가상 문서입니다.
      </footer>
    </main>
  );
}
