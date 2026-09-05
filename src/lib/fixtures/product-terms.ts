import type { ProductTermsCandidate } from "@/lib/domain/types";
import type { ProductId } from "@/lib/products/repository";

/**
 * fixture 모드용 상품 조건 추출 결과.
 *
 * AI 추출 단계를 대신하는 후보 데이터다. 근거는 아직 미확인 상태이며
 * verifyProductTerms 가 실제 페이지 텍스트와 대조한 뒤에야 판정에 쓰인다.
 * 5단계에서 /api/products/[productId]/analyze 로 교체한다.
 */
export const PRODUCT_TERMS_FIXTURES: Record<ProductId, ProductTermsCandidate> = {
  "structured-note-full-loss": {
    principalLossPossible: {
      value: true,
      evidence: {
        quote:
          "본 상품은 원금이 보장되지 않으며 투자원금의 전부 또는 일부에 손실이 발생할 수 있습니다.",
        page: 3,
      },
    },
    maxLossPercent: {
      value: 100,
      evidence: {
        quote: "기초자산 가격이 0이 되는 경우 최대 100%의 원금 손실이 발생할 수 있습니다.",
        page: 3,
      },
    },
    maturityMonths: {
      value: 36,
      evidence: { quote: "본 상품의 만기는 발행일로부터 36개월입니다.", page: 2 },
    },
    earlyRedemptionAllowed: {
      value: true,
      evidence: {
        quote: "투자자는 발행일 이후 매 영업일에 중도환매를 신청할 수 있습니다.",
        page: 4,
      },
    },
    earlyRedemptionLossPossible: {
      value: true,
      evidence: {
        quote:
          "중도환매 시에는 중도환매 수수료 및 기초자산 가격 변동에 따라 원금 손실이 발생할 수 있습니다.",
        page: 4,
      },
    },
    depositProtected: {
      value: false,
      evidence: { quote: "본 상품은 예금자보호법에 따라 보호되지 않습니다.", page: 4 },
    },
  },
  "structured-note-unknown-limit": {
    principalLossPossible: {
      value: true,
      evidence: {
        quote:
          "본 상품은 원금이 보장되지 않는 상품으로 시장 상황에 따라 투자원금의 손실이 발생할 수 있습니다.",
        page: 2,
      },
    },
    // 최대 손실 한도는 문서에 없다. 추정하지 않고 비워 둔다.
    maxLossPercent: { value: null, evidence: null },
    maturityMonths: {
      value: 24,
      evidence: { quote: "본 상품의 만기는 발행일로부터 24개월입니다.", page: 2 },
    },
    earlyRedemptionAllowed: {
      value: true,
      evidence: {
        quote: "투자자는 발행일 이후 매 영업일에 중도환매를 신청할 수 있습니다.",
        page: 3,
      },
    },
    earlyRedemptionLossPossible: {
      value: true,
      evidence: {
        quote: "중도환매 시 기초자산 가격 변동에 따라 원금 손실이 발생할 수 있습니다.",
        page: 3,
      },
    },
    depositProtected: {
      value: false,
      evidence: { quote: "본 상품은 예금자보호법에 따라 보호되지 않습니다.", page: 3 },
    },
  },
  // 페이지 누락 문서는 조건 추출 단계에 도달하지 않는다.
  "structured-note-missing-page": {
    principalLossPossible: { value: null, evidence: null },
    maxLossPercent: { value: null, evidence: null },
    maturityMonths: { value: null, evidence: null },
    earlyRedemptionAllowed: { value: null, evidence: null },
    earlyRedemptionLossPossible: { value: null, evidence: null },
    depositProtected: { value: null, evidence: null },
  },
};
