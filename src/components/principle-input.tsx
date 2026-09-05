"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { DEMO_INPUTS } from "@/lib/fixtures/principles";
import { CARD, Notice, PRIMARY_BUTTON, SECONDARY_BUTTON, SectionTitle } from "./ui";

export function PrincipleInput({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (input: string) => void;
}) {
  const [value, setValue] = useState("");
  const tooShort = value.trim().length < 5;

  return (
    <section className={CARD}>
      <SectionTitle
        step="1단계"
        title="어떤 돈인지, 어떤 조건이 중요한지 알려주세요"
        description="입력한 문장은 검증 가능한 항목으로 정리됩니다. 정리된 내용은 다음 화면에서 직접 확인하고 고칠 수 있습니다."
      />

      <label htmlFor="principle-input" className="sr-only">
        금융 원칙 입력
      </label>
      <textarea
        id="principle-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        placeholder="예: 1년 뒤 전세자금으로 사용할 돈이고 원금 손실은 원하지 않습니다."
        className="w-full resize-none rounded-xl border border-line bg-white p-4 text-sm leading-6 text-zinc-900 placeholder:text-zinc-400"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_INPUTS.map((demo) => (
          <button
            key={demo.id}
            type="button"
            className={SECONDARY_BUTTON}
            onClick={() => setValue(demo.text)}
          >
            {demo.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <Notice>
          <ShieldAlert aria-hidden className="mr-1 inline h-4 w-4 align-text-bottom" />
          주민등록번호, 계좌번호, 연락처 등 개인정보와 실제 금융 거래내역은 입력하지
          마세요. SecondSign은 이런 정보를 저장하지 않습니다.
        </Notice>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={tooShort || pending}
          onClick={() => onSubmit(value.trim())}
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              정리하는 중
            </>
          ) : (
            "분석하기"
          )}
        </button>
      </div>
    </section>
  );
}
