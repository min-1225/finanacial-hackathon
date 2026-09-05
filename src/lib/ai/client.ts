import { GoogleGenAI } from "@google/genai";
import { getAiConfig } from "@/lib/config";

/**
 * 생성형 AI 호출을 격리하는 유일한 지점.
 *
 * 이 모듈은 JSON 문자열을 파싱해 돌려주기만 한다.
 * 금융 판단이나 도메인 상태를 만들지 않고, 반환값은 항상 호출부에서 Zod 로 검증한다.
 * 다른 제공자로 바꾸려면 이 파일만 교체하면 된다.
 */

const TIMEOUT_MS = 20_000;

export type AiErrorKind = "TIMEOUT" | "NETWORK" | "EMPTY_RESPONSE" | "INVALID_JSON";

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
    /** 원인 오류의 요약. 개발 로그에만 남기고 사용자 화면에는 노출하지 않는다. */
    readonly detail?: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/** 제공자가 돌려준 오류에서 사람이 읽을 수 있는 부분만 뽑는다. */
function describe(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const causeText =
      cause instanceof Error
        ? ` / cause: ${cause.message}`
        : cause
          ? ` / cause: ${String(cause)}`
          : "";
    return `${error.name}: ${error.message}${causeText}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export type StructuredRequest = {
  /** 모델의 역할과 금지 사항 */
  systemInstruction: string;
  /** 이번 호출의 입력 */
  prompt: string;
  /** 응답 JSON Schema */
  schema: Record<string, unknown>;
};

function isRetryable(error: unknown): boolean {
  if (error instanceof AiError) {
    return error.kind === "TIMEOUT" || error.kind === "NETWORK";
  }
  return true;
}

async function callOnce({ systemInstruction, prompt, schema }: StructuredRequest) {
  const { apiKey, model } = getAiConfig();
  const client = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        temperature: 0,
        abortSignal: controller.signal,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new AiError("EMPTY_RESPONSE", "AI 응답이 비어 있습니다.");
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      // 형식 오류는 재시도하지 않는다.
      throw new AiError("INVALID_JSON", "AI 응답을 JSON 으로 해석하지 못했습니다.");
    }
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (controller.signal.aborted) {
      throw new AiError("TIMEOUT", "AI 응답이 제한시간을 넘었습니다.", describe(error));
    }
    throw new AiError("NETWORK", "AI API 호출에 실패했습니다.", describe(error));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 구조화 JSON 을 한 번 요청한다.
 * 네트워크·제한시간 오류만 한 번 재시도하고, 형식 오류는 재시도하지 않는다.
 */
export async function requestStructuredJson(
  request: StructuredRequest,
): Promise<unknown> {
  try {
    return await callOnce(request);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    return callOnce(request);
  }
}
