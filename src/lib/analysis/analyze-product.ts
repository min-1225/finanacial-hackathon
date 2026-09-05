import {
  buildDocumentStatus,
  getProduct,
  type ProductId,
} from "@/lib/products/repository";
import { verifyProductTerms } from "@/lib/evidence/verify-evidence";
import { PRODUCT_TERMS_FIXTURES } from "@/lib/fixtures/product-terms";
import { ProductTermsCandidateSchema } from "@/lib/domain/schemas";
import type { DocumentStatus, ProductTerms } from "@/lib/domain/types";
import { extractProductTerms } from "@/lib/ai/extract-product-terms";
import { isFixtureMode } from "@/lib/config";

/**
 * 문서 상태 확인 → 조건 추출 → 근거 재검증 파이프라인.
 *
 * 추출 단계만 AI 를 사용하고, 근거 확인은 항상 프로젝트 코드가 수행한다.
 * AI 가 무엇을 반환하든 verifyProductTerms 를 통과하지 못한 값은 판정에 쓰이지 않는다.
 */

export type AnalyzeSuccess = {
  ok: true;
  status: DocumentStatus;
  terms: ProductTerms;
  fixture: boolean;
};

export type AnalyzeFailure = {
  ok: false;
  reason: "DOCUMENT_INCOMPLETE";
  status: DocumentStatus;
};

export async function analyzeProduct(
  productId: ProductId,
): Promise<AnalyzeSuccess | AnalyzeFailure> {
  const record = getProduct(productId);
  const status = buildDocumentStatus(record);

  // 페이지가 누락된 문서는 AI 를 호출하지 않고 즉시 중단한다.
  if (!status.complete) {
    return { ok: false, reason: "DOCUMENT_INCOMPLETE", status };
  }

  const fixture = isFixtureMode();
  const candidate = fixture
    ? ProductTermsCandidateSchema.parse(PRODUCT_TERMS_FIXTURES[productId])
    : await extractProductTerms(record.manifest, record.pages);

  const { terms, failures } = verifyProductTerms(candidate, record.pages);

  if (failures.length > 0) {
    // 사용자 문서 원문은 남기지 않고 어떤 항목이 왜 실패했는지만 남긴다.
    console.warn("[evidence] 근거 확인 실패", { productId, failures });
  }

  return { ok: true, status, terms, fixture };
}
