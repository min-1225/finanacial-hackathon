import { NextResponse } from "next/server";
import { analyzeProduct } from "@/lib/analysis/analyze-product";
import { isProductId } from "@/lib/products/repository";
import { ProductTermsSchema } from "@/lib/domain/schemas";
import { AiSchemaError } from "@/lib/ai/structure-principles";
import { AiError } from "@/lib/ai/client";
import { ConfigError } from "@/lib/config";

/**
 * POST /api/products/[productId]/analyze
 *
 * 문서 상태를 확인하고 근거가 재검증된 상품 조건을 돌려준다.
 * productId 는 서버 허용 목록으로만 조회해 임의 파일 경로 접근을 막는다.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const { productId } = await context.params;

  if (!isProductId(productId)) {
    return NextResponse.json(
      { error: "존재하지 않는 샘플 상품입니다." },
      { status: 404 },
    );
  }

  try {
    const analysis = await analyzeProduct(productId);

    if (!analysis.ok) {
      return NextResponse.json(
        {
          error: "문서에 누락된 페이지가 있어 상품 검증을 진행할 수 없습니다.",
          status: analysis.status,
        },
        { status: 409 },
      );
    }

    const parsedTerms = ProductTermsSchema.safeParse(analysis.terms);
    if (!parsedTerms.success) {
      return NextResponse.json(
        { error: "상품 조건 검증 결과 구조가 올바르지 않습니다." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      status: analysis.status,
      terms: parsedTerms.data,
      fixture: analysis.fixture,
    });
  } catch (error) {
    if (error instanceof AiSchemaError) {
      return NextResponse.json(
        { error: "AI 응답이 정해진 구조와 달라 사용하지 않았습니다." },
        { status: 422 },
      );
    }
    if (error instanceof ConfigError) {
      console.error("[config]", error.message);
      return NextResponse.json(
        { error: "서버 설정이 완료되지 않아 분석을 시작할 수 없습니다." },
        { status: 500 },
      );
    }
    if (error instanceof AiError) {
      // 사용자 화면에는 일반 문구만 나가고, 원인은 서버 콘솔에만 남긴다.
      console.error("[ai]", error.kind, error.detail ?? "");
      return NextResponse.json({ error: "AI API 호출에 실패했습니다." }, { status: 502 });
    }
    console.error("[unknown]", error);
    return NextResponse.json({ error: "알 수 없는 오류가 발생했습니다." }, { status: 500 });
  }
}
