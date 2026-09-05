"use client";

import type { ClarificationQuestion, PrincipleField } from "@/lib/domain/types";
import { CARD, SECONDARY_BUTTON, SectionTitle } from "./ui";

export function ClarificationForm({
  questions,
  onAnswer,
}: {
  questions: ClarificationQuestion[];
  onAnswer: (field: PrincipleField, value: string) => void;
}) {
  const [current, ...rest] = questions;

  if (!current) return null;

  return (
    <section className={CARD}>
      <SectionTitle
        step="2단계"
        title="입력만으로 확인할 수 없는 항목만 여쭤봅니다"
        description={
          rest.length > 0
            ? `남은 확인 항목 ${questions.length}개 중 1번째입니다.`
            : "마지막 확인 항목입니다."
        }
      />

      <fieldset>
        <legend className="text-base font-semibold text-zinc-900">
          {current.question}
        </legend>
        <div className="mt-4 grid gap-2">
          {current.options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${SECONDARY_BUTTON} justify-start px-4 py-3 text-left`}
              onClick={() => onAnswer(current.field, option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
