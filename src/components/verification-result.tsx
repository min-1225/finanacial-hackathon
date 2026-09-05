"use client";

import { AlertTriangle, HelpCircle, Info, RotateCcw } from "lucide-react";
import type {
  ConfirmedUserPrinciples,
  DocumentStatus,
  ProductTerms,
  RuleResult,
  RuleStatus,
} from "@/lib/domain/types";
import { PRINCIPLE_LABELS } from "@/lib/rules/evaluate-rules";
import { PRODUCT_TERM_FIELDS } from "@/lib/domain/schemas";
import { EvidencePanel } from "./evidence-panel";
import { CARD, Notice, PRIMARY_BUTTON, SectionTitle } from "./ui";

const GROUPS: {
  status: RuleStatus;
  title: string;
  description: string;
  icon: React.ReactNode;
  card: string;
}[] = [
  {
    status: "VIOLATION",
    title: "원칙 위반",
    description: "확정한 원칙과 상품 문서의 조건이 직접 충돌합니다.",
    icon: <AlertTriangle aria-hidden className="h-4 w-4 text-red-600" />,
    card: "border-red-200 bg-red-50/70",
  },
  {
    status: "HOLD",
    title: "검증 보류",
    description: "문서만으로는 확인할 수 없어 판단하지 않았습니다.",
    icon: <HelpCircle aria-hidden className="h-4 w-4 text-amber-600" />,
    card: "border-amber-200 bg-amber-50/70",
  },
  {
    status: "CONDITION_CONFIRMED",
    title: "관련 조건 확인",
    description: "원칙과 관련된 상품 조건을 원문에서 확인했습니다.",
    icon: <Info aria-hidden className="h-4 w-4 text-zinc-500" />,
    card: "border-line bg-white",
  },
];

function principleSummary(principles: ConfirmedUserPrinciples): string[] {
  const lines: string[] = [];
  if (principles.purpose) lines.push(`자금 목적 · ${principles.purpose}`);
  if (principles.useWithinMonths !== null) {
    lines.push(`사용 예정 · ${principles.useWithinMonths}개월 이내`);
  }
  lines.push(
    `원금손실 · ${principles.principalLossAllowed ? "허용" : "불허"}${
      principles.maxLossPercent !== null ? ` (최대 ${principles.maxLossPercent}%)` : ""
    }`,
  );
  lines.push(`중도인출 · ${principles.earlyWithdrawalRequired ? "필요" : "불필요"}`);
  if (principles.earlyWithdrawalRequired) {
    lines.push(
      `중도인출 시 원금손실 · ${
        principles.earlyWithdrawalPrincipalLossAllowed ? "허용" : "불허"
      }`,
    );
  }
  lines.push(`예금자보호 · ${principles.depositProtectionRequired ? "필요" : "불필요"}`);
  return lines;
}

function unverifiedCount(terms: ProductTerms): number {
  return PRODUCT_TERM_FIELDS.filter((field) => {
    const evidence = terms[field].evidence;
    return evidence !== null && !evidence.verified;
  }).length;
}

export function VerificationResult({
  principles,
  documentStatus,
  terms,
  results,
  onRestart,
}: {
  principles: ConfirmedUserPrinciples;
  documentStatus: DocumentStatus;
  terms: ProductTerms;
  results: RuleResult[];
  onRestart: () => void;
}) {
  const unverified = unverifiedCount(terms);

  return (
    <div className="grid gap-5">
      <section className={CARD}>
        <SectionTitle
          step="6단계"
          title="가입 전 검증 결과"
          description={`${documentStatus.productName} · ${documentStatus.documentType} · ${documentStatus.issuedAt}`}
        />
        <div className="rounded-xl border border-line bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-900">내가 확정한 금융 원칙</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-700 sm:grid-cols-2">
            {principleSummary(principles).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        {unverified > 0 ? (
          <div className="mt-4">
            <Notice tone="warning">
              상품 조건 {unverified}건은 제시된 원문을 문서에서 확인하지 못해 판정에
              사용하지 않았습니다.
            </Notice>
          </div>
        ) : null}
      </section>

      {GROUPS.map((group) => {
        const items = results.filter((result) => result.status === group.status);
        if (items.length === 0) return null;

        return (
          <section key={group.status} className={CARD}>
            <div className="mb-4 flex items-center gap-2">
              {group.icon}
              <h3 className="text-base font-bold text-zinc-900">
                {group.title}
                <span className="ml-2 text-sm font-medium text-muted">
                  {items.length}건
                </span>
              </h3>
            </div>
            <p className="mb-4 text-sm text-muted">{group.description}</p>

            <ul className="grid gap-3">
              {items.map((result) => (
                <li
                  key={result.principle}
                  className={`rounded-xl border p-4 ${group.card}`}
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {PRINCIPLE_LABELS[result.principle]}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-700">
                    {result.summary}
                  </p>
                  <EvidencePanel
                    evidence={result.evidence}
                    documentName={documentStatus.productName}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className={CARD}>
        <Notice>
          SecondSign은 상품 추천이나 가입 판단을 제공하지 않습니다. 이 결과는 확정한
          원칙과 문서에서 근거가 확인된 조건을 대조한 것이며, 상품의 안전성이나
          적합성에 대한 종합 판정이 아닙니다.
        </Notice>
        <div className="mt-5 flex justify-end">
          <button type="button" className={PRIMARY_BUTTON} onClick={onRestart}>
            <RotateCcw aria-hidden className="h-4 w-4" />
            처음부터 다시 하기
          </button>
        </div>
      </section>
    </div>
  );
}
