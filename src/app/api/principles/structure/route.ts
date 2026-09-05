import { NextResponse } from "next/server";
import {
  StructurePrinciplesRequestSchema,
  UserPrinciplesDraftSchema,
} from "@/lib/domain/schemas";
import { structurePrinciplesFixture } from "@/lib/fixtures/principles";
import { structurePrinciples, AiSchemaError } from "@/lib/ai/structure-principles";
import { AiError } from "@/lib/ai/client";
import { ConfigError, isFixtureMode } from "@/lib/config";

/**
 * POST /api/principles/structure
 *
 * 자연어 입력을 금융 원칙 초안으로 구조화한다.
 * 응답에는 확정 상태(CONFIRMED)가 들어가지 않는다. 확정은 사용자 액션으로만 만든다.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const parsedRequest = StructurePrinciplesRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: "입력이 비어 있거나 허용 길이를 벗어났습니다." },
      { status: 400 },
    );
  }

  const fixture = isFixtureMode();

  try {
    const draft = fixture
      ? structurePrinciplesFixture(parsedRequest.data.input)
      : await structurePrinciples(parsedRequest.data.input);

    // 구조화 결과는 항상 스키마로 다시 검증한 뒤 사용한다.
    const parsedDraft = UserPrinciplesDraftSchema.safeParse(draft);
    if (!parsedDraft.success) {
      return NextResponse.json(
        { error: "구조화 결과가 스키마에 맞지 않습니다." },
        { status: 422 },
      );
    }

    return NextResponse.json({ draft: parsedDraft.data, fixture });
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
