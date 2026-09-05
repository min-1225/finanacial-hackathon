# SecondSign

사용자가 확정한 금융 원칙과 상품설명서에서 **근거가 확인된 조건만** 결정론적으로 대조하는 가입 전 검증 MVP입니다.

- [기능명세서](docs/FUNCTIONAL_SPECIFICATION.md)
- [개발명세서](docs/DEVELOPMENT_SPECIFICATION.md)

## 현재 진행 상황

개발명세서 12장 기준 **0~5단계 완료**. 실제 Gemini 호출까지 확인했고 배포가 남아 있다.

| 단계 | 상태 |
| --- | --- |
| 0. 프로젝트 생성과 화면 뼈대 | 완료 |
| 1. 도메인 스키마 | 완료 |
| 2. fixture 기반 수직 슬라이스 | 완료 |
| 3. 금융 원칙 AI 구조화 | 완료(실제 API 호출 확인) |
| 4. 상품 분석과 근거 확인 | 완료(실제 API 호출 확인) |
| 5. 전체 UI와 오류 처리 | 완료 |
| 6. 테스트와 배포 | 테스트 완료, 배포 미착수 |

생성형 AI 제공자는 OpenAI가 아니라 **Google Gemini**를 쓴다. 기본 모델은 `gemini-3.6-flash`이고, 호출은 `src/lib/ai/client.ts` 한 파일에만 있다.

## 실행

```bash
npm install
cp .env.example .env.local
# .env.local 에 GEMINI_API_KEY 를 넣는다
npm run dev                  # http://localhost:3000
```

`USE_FIXTURE_MODE=true` 로 두면 AI를 호출하지 않고 고정 샘플로 전 구간이 동작한다.
데모 중 외부 API가 불안정하면 이 값을 바꿔 재시작하면 되고, 화면 상단에 샘플 모드임이 표시된다.

## 검사

```bash
npm run lint
npm run typecheck
npm test        # 49개
npm run build
npm run check   # 위 네 검사를 순서대로 실행
npm run check:gemini # 실제 Gemini 연결·구조화 진단
```

## 구조

```text
src/lib/domain/      스키마(Zod strict), 타입, 금융 원칙 도메인 규칙
src/lib/rules/       다섯 개의 순수 규칙 함수와 evaluateRules
src/lib/evidence/    원문·페이지 재검증(verified 플래그를 결정하는 유일한 지점)
src/lib/products/    샘플 상품 저장소(허용 목록 기반)
src/lib/analysis/    문서 상태 확인 → 조건 추출 → 근거 검증 파이프라인
src/lib/ai/          Gemini 호출, 프롬프트, JSON Schema, 응답 → 도메인 매핑
src/lib/fixtures/    USE_FIXTURE_MODE 일 때 AI 대신 쓰는 고정 데이터
src/data/products/   샘플 상품 manifest.json 과 페이지별 텍스트
src/components/      단계형 UI
tests/               스키마·규칙·근거 검증 단위 테스트, 시나리오 통합 테스트
```

## 남은 일

- 샘플 PDF 3종 제작 후 `public/products/` 배치, 결과 화면에서 페이지 링크 연결
- Vercel 배포와 환경변수 설정(`GEMINI_API_KEY`, `GEMINI_MODEL`, `USE_FIXTURE_MODE`)
- 배포 URL smoke test

## 배포 순서

1. `sangmin` 브랜치에서 `npm run check`과 `npm run check:gemini`를 통과한다.
2. Pull Request로 `sangmin` 브랜치를 `main`에 병합한다.
3. Vercel에서 저장소를 가져오고 Node.js 24를 사용한다.
4. Vercel Production 환경변수에 `.env.example`의 세 항목을 설정한다.
5. 배포 후 금융 원칙 구조화와 상품 분석을 한 번씩 실행한다.

## 원칙

- 사용자가 확정하기 전의 값은 규칙 엔진에 전달하지 않는다.
- AI 는 `verified: true` 를 만들 수 없다. 근거 확인은 `src/lib/evidence/verify-evidence.ts` 만 수행한다.
- 근거를 확인하지 못한 조건은 판정에서 제외되고 해당 원칙은 `HOLD` 가 된다.
- 규칙 함수는 네트워크·파일·시스템 시간에 접근하지 않는 순수 함수다.
- API 키는 `src/lib/config.ts` 에서만 읽는다. 클라이언트 컴포넌트에서 import 하지 않는다.
