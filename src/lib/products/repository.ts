import type {
  DocumentStatus,
  ProductManifest,
  ProductPage,
} from "@/lib/domain/types";
import {
  ProductManifestSchema,
  ProductPageSchema,
} from "@/lib/domain/schemas";
import { z } from "zod";

import fullLossManifest from "@/data/products/structured-note-full-loss/manifest.json";
import fullLossPages from "@/data/products/structured-note-full-loss/pages.json";
import unknownLimitManifest from "@/data/products/structured-note-unknown-limit/manifest.json";
import unknownLimitPages from "@/data/products/structured-note-unknown-limit/pages.json";
import missingPageManifest from "@/data/products/structured-note-missing-page/manifest.json";
import missingPagePages from "@/data/products/structured-note-missing-page/pages.json";

/**
 * 샘플 상품 저장소.
 *
 * 상품 ID 는 아래 허용 목록으로만 조회한다.
 * 사용자가 보낸 문자열로 파일 경로를 만들지 않는다.
 */

export const PRODUCT_IDS = [
  "structured-note-full-loss",
  "structured-note-unknown-limit",
  "structured-note-missing-page",
] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];

const PagesFileSchema = z.strictObject({
  pages: z.array(ProductPageSchema).min(1),
});

type ProductRecord = { manifest: ProductManifest; pages: ProductPage[] };

function load(manifest: unknown, pages: unknown): ProductRecord {
  return {
    manifest: ProductManifestSchema.parse(manifest),
    pages: PagesFileSchema.parse(pages).pages,
  };
}

const PRODUCTS: Record<ProductId, ProductRecord> = {
  "structured-note-full-loss": load(fullLossManifest, fullLossPages),
  "structured-note-unknown-limit": load(unknownLimitManifest, unknownLimitPages),
  "structured-note-missing-page": load(missingPageManifest, missingPagePages),
};

export function isProductId(value: string): value is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(value);
}

export function listProducts(): ProductManifest[] {
  return PRODUCT_IDS.map((id) => PRODUCTS[id].manifest);
}

export function getProduct(id: ProductId): ProductRecord {
  return PRODUCTS[id];
}

/** 기대 페이지 수와 실제 페이지를 비교해 문서 완전성을 검사한다. */
export function buildDocumentStatus(record: ProductRecord): DocumentStatus {
  const { manifest, pages } = record;
  const availablePages = pages.map((page) => page.page).sort((a, b) => a - b);
  const missingPages: number[] = [];

  for (let page = 1; page <= manifest.expectedPageCount; page += 1) {
    if (!availablePages.includes(page)) {
      missingPages.push(page);
    }
  }

  return {
    productId: manifest.productId,
    productName: manifest.productName,
    documentType: manifest.documentType,
    issuedAt: manifest.issuedAt,
    expectedPageCount: manifest.expectedPageCount,
    availablePages,
    missingPages,
    complete: missingPages.length === 0,
  };
}
