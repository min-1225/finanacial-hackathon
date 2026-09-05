/**
 * 서버 전용 환경변수 접근.
 *
 * API 키는 이 모듈을 통해서만 읽고 브라우저로 내려보내지 않는다.
 * 클라이언트 컴포넌트에서는 import 하지 않는다.
 */

export type AiConfig = {
  apiKey: string;
  model: string;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const DEFAULT_MODEL = "gemini-3.6-flash";

/** true 이면 AI 를 호출하지 않고 fixture 데이터를 사용한다. */
export function isFixtureMode(): boolean {
  return process.env.USE_FIXTURE_MODE === "true";
}

export function getAiConfig(): AiConfig {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new ConfigError(
      "GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 을 확인하거나 USE_FIXTURE_MODE=true 로 실행하세요.",
    );
  }

  return { apiKey, model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL };
}
