"use client";

import { Quote } from "lucide-react";
import type { Evidence } from "@/lib/domain/types";

export function EvidencePanel({
  evidence,
  documentName,
}: {
  evidence: Evidence[];
  documentName: string;
}) {
  if (evidence.length === 0) return null;

  return (
    <details className="mt-4 rounded-xl border border-line bg-white">
      <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium text-zinc-700">
        판단에 사용한 원문 {evidence.length}건 보기
      </summary>
      <ul className="grid gap-3 border-t border-line px-4 py-4">
        {evidence.map((item, index) => (
          <li key={`${item.page}-${index}`}>
            <blockquote className="flex gap-2 text-sm leading-6 text-zinc-800">
              <Quote aria-hidden className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-300" />
              <span>{item.quote}</span>
            </blockquote>
            <p className="mt-1 pl-5.5 text-xs text-muted">
              {documentName} · {item.page}페이지 · 원문 확인됨
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
