"use client";

import { FileText } from "lucide-react";
import type { ProductManifest } from "@/lib/domain/types";
import { CARD, Notice, SectionTitle } from "./ui";

export function ProductSelector({
  products,
  onSelect,
}: {
  products: ProductManifest[];
  onSelect: (productId: string) => void;
}) {
  return (
    <section className={CARD}>
      <SectionTitle
        step="4단계"
        title="검증할 상품설명서를 고르세요"
        description="MVP에서는 서비스에 포함된 가상 상품설명서만 검증합니다. 파일 업로드는 제공하지 않습니다."
      />

      <ul className="grid gap-3">
        {products.map((product) => (
          <li key={product.productId}>
            <button
              type="button"
              onClick={() => onSelect(product.productId)}
              className="flex w-full items-start gap-3 rounded-xl border border-line bg-white p-4 text-left transition hover:border-zinc-400"
            >
              <FileText aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
              <span>
                <span className="block text-sm font-semibold text-zinc-900">
                  {product.productName}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {product.documentType} · {product.issuedAt} · {product.expectedPageCount}
                  페이지
                </span>
                <span className="mt-2 block text-sm leading-6 text-zinc-600">
                  {product.summary}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Notice>
          모든 샘플 문서는 공개 상품설명서의 형식을 참고해 만든 가상 문서이며 실제로
          판매되는 금융상품이 아닙니다.
        </Notice>
      </div>
    </section>
  );
}
