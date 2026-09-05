"use client";

import { CheckCircle2 } from "lucide-react";
import type { PrincipleField, UserPrincipleValues } from "@/lib/domain/types";
import {
  PRINCIPLE_FIELD_LABELS,
  isReadyToConfirm,
  normalizePrincipleValues,
  unresolvedRequiredFields,
} from "@/lib/domain/principles";
import { CARD, Notice, PRIMARY_BUTTON, SectionTitle } from "./ui";

type BooleanField = Extract<
  PrincipleField,
  | "principalLossAllowed"
  | "earlyWithdrawalRequired"
  | "earlyWithdrawalPrincipalLossAllowed"
  | "depositProtectionRequired"
>;

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-center">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Choice({
  value,
  options,
  onChange,
  name,
}: {
  value: boolean | null;
  options: [string, string];
  onChange: (next: boolean) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {[true, false].map((option, index) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={
            value === option
              ? "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
              : "rounded-lg border border-line bg-white px-3 py-2 text-sm text-zinc-600 hover:border-zinc-400"
          }
        >
          {options[index]}
        </button>
      ))}
    </div>
  );
}

export function PrincipleConfirmation({
  values,
  onChange,
  onConfirm,
}: {
  values: UserPrincipleValues;
  onChange: (next: UserPrincipleValues) => void;
  onConfirm: () => void;
}) {
  const missing = unresolvedRequiredFields(values);
  const ready = isReadyToConfirm(values);

  const set = (patch: Partial<UserPrincipleValues>) =>
    onChange(normalizePrincipleValues({ ...values, ...patch }));

  const setBoolean = (field: BooleanField) => (next: boolean) =>
    set({ [field]: next } as Partial<UserPrincipleValues>);

  return (
    <section className={CARD}>
      <SectionTitle
        step="3단계"
        title="이 원칙이 맞는지 확인해 주세요"
        description="잘못 정리된 항목은 직접 고칠 수 있습니다. 여기에서 확정한 값만 상품 검증에 사용합니다."
      />

      <div>
        <Row label={PRINCIPLE_FIELD_LABELS.purpose} hint="판정에는 사용하지 않습니다">
          <input
            type="text"
            value={values.purpose ?? ""}
            onChange={(event) =>
              set({ purpose: event.target.value.trim() === "" ? null : event.target.value })
            }
            placeholder="예: 전세자금"
            className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-sm"
          />
        </Row>

        <Row label={PRINCIPLE_FIELD_LABELS.useWithinMonths}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={600}
              value={values.useWithinMonths ?? ""}
              onChange={(event) =>
                set({
                  useWithinMonths:
                    event.target.value === "" ? null : Number(event.target.value),
                })
              }
              className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
            <span className="text-sm text-muted">개월 이내</span>
          </div>
        </Row>

        <Row label={PRINCIPLE_FIELD_LABELS.principalLossAllowed}>
          <Choice
            name={PRINCIPLE_FIELD_LABELS.principalLossAllowed}
            value={values.principalLossAllowed}
            options={["허용", "불허"]}
            onChange={setBoolean("principalLossAllowed")}
          />
        </Row>

        <Row
          label={PRINCIPLE_FIELD_LABELS.maxLossPercent}
          hint={
            values.principalLossAllowed === false
              ? "원금손실을 허용하지 않으므로 0%로 고정됩니다"
              : undefined
          }
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              disabled={values.principalLossAllowed === false}
              value={values.maxLossPercent ?? ""}
              onChange={(event) =>
                set({
                  maxLossPercent:
                    event.target.value === "" ? null : Number(event.target.value),
                })
              }
              className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-400"
            />
            <span className="text-sm text-muted">% 까지</span>
          </div>
        </Row>

        <Row label={PRINCIPLE_FIELD_LABELS.earlyWithdrawalRequired}>
          <Choice
            name={PRINCIPLE_FIELD_LABELS.earlyWithdrawalRequired}
            value={values.earlyWithdrawalRequired}
            options={["필요", "불필요"]}
            onChange={setBoolean("earlyWithdrawalRequired")}
          />
        </Row>

        {values.earlyWithdrawalRequired ? (
          <Row label={PRINCIPLE_FIELD_LABELS.earlyWithdrawalPrincipalLossAllowed}>
            <Choice
              name={PRINCIPLE_FIELD_LABELS.earlyWithdrawalPrincipalLossAllowed}
              value={values.earlyWithdrawalPrincipalLossAllowed}
              options={["허용", "불허"]}
              onChange={setBoolean("earlyWithdrawalPrincipalLossAllowed")}
            />
          </Row>
        ) : null}

        <Row label={PRINCIPLE_FIELD_LABELS.depositProtectionRequired}>
          <Choice
            name={PRINCIPLE_FIELD_LABELS.depositProtectionRequired}
            value={values.depositProtectionRequired}
            options={["필요", "불필요"]}
            onChange={setBoolean("depositProtectionRequired")}
          />
        </Row>
      </div>

      {missing.length > 0 ? (
        <div className="mt-5">
          <Notice tone="warning">
            아직 비어 있는 항목이 있습니다:{" "}
            {missing.map((field) => PRINCIPLE_FIELD_LABELS[field]).join(", ")}
          </Notice>
        </div>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className={PRIMARY_BUTTON}
          disabled={!ready}
          onClick={onConfirm}
        >
          <CheckCircle2 aria-hidden className="h-4 w-4" />이 원칙으로 확정
        </button>
      </div>
    </section>
  );
}
