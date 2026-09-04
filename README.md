# SecondSign

가입 직전, 사용자가 확정한 금융 원칙과 상품설명서의 근거가 확인된 조건만 대조하는 MVP입니다.

현재 저장소에는 UI나 실제 LLM/PDF 연동보다 먼저 확인할 수 있도록 핵심 처리 파이프라인을 구축했습니다.

## 파이프라인

```text
사용자 자연어
  -> PrincipleStructurer (AI 어댑터 경계)
  -> 금융 원칙 초안
  -> 사용자 수정·확정

상품 문서
  -> ProductDocumentAnalyzer (PDF/OCR/AI 어댑터 경계)
  -> 문서 완전성 검사
  -> 근거 원문·페이지가 연결된 상품 조건

확정 원칙 + 검증된 근거
  -> 결정론적 규칙 엔진
  -> 원칙 위반 / 검증 보류 / 관련 조건 확인
```

중요한 안전장치는 다음과 같습니다.

- 사용자 확정 전 초안은 규칙 엔진 입력 타입과 분리했습니다.
- 상품 조건은 `값 + 원문 + 페이지 + 근거 확인 여부`로 저장합니다.
- 근거가 없거나 확인되지 않은 값은 `검증 보류`로 처리합니다.
- 페이지가 누락된 문서는 정상 검증 결과 생성을 중단합니다.
- AI 어댑터와 최종 규칙 판정을 분리해 AI가 적합성·안전성을 직접 판정하지 않습니다.

## 실행

Node.js 24 이상이 필요합니다.

```bash
npm install
npm run check
npm run demo
```

- `npm run check`: TypeScript 타입 검사 후 전체 테스트 실행
- `npm run demo`: 기본 데모 시나리오의 JSON 결과 출력
- GitHub Actions: `main` 푸시와 Pull Request마다 동일한 검증 실행

## 코드 위치

- `src/domain.ts`: Zod 런타임 스키마와 TypeScript 타입
- `src/ports.ts`: 추후 연결할 자연어 구조화 및 PDF 분석 인터페이스
- `src/pipeline.ts`: 단계 순서와 입력/출력 검증
- `src/rules.ts`: 다섯 가지 금융 원칙의 결정론적 규칙
- `examples/default-demo.json`: 기본 데모 입력·상품 분석 결과
- `test/*.test.ts`: 기능명세서의 시나리오·문서 누락 예외·단계 경계 테스트

## 라이브러리와 프로젝트 코드 구분

라이브러리에서 제공하는 기능은 직접 다시 구현하지 않았습니다.

- `zod`: `z.object`, `z.enum`, `parse`, `superRefine`을 사용한 런타임 입력 검증
- `vitest`: `describe`, `it`, `expect`를 사용한 테스트
- `node:fs/promises`: Node.js가 제공하는 `readFile`로 데모 JSON 읽기
- `tsx`: TypeScript 데모 스크립트 실행
- `typescript`: 정적 타입 검사

아래는 이 프로젝트에서 새로 정의한 애플리케이션 코드입니다.

- `SecondSignPipeline`: 구조화·사용자 확정·문서 분석·검증의 단계 경계를 강제
- `PrincipleStructurer`, `ProductDocumentAnalyzer`: 실제 LLM/PDF 구현을 나중에 꽂기 위한 포트
- `evaluateRules` 및 내부 다섯 규칙 함수: 명세서의 금융 원칙 비교 로직
- `verifiedValue`, `verifiedEvidence`: 확인된 문서 근거만 규칙에 전달하는 보조 함수
- `IncompleteDocumentError`: 누락 페이지가 있는 문서의 검증을 중단하는 도메인 오류 타입

세부 기능 범위는 [`docs/FUNCTIONAL_SPECIFICATION.md`](docs/FUNCTIONAL_SPECIFICATION.md)를 참고하세요.
