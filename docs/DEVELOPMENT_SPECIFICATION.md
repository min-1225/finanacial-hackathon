# SecondSign MVP 개발명세서

> 기준 문서: `docs/FUNCTIONAL_SPECIFICATION.md`
> 목적: 해커톤 당일 바로 구현할 수 있도록 기술 선택, 처리 파이프라인, API 계약, 개발 순서와 완료 조건을 고정한다.

---

## 1. 개발 목표

SecondSign MVP는 사용자가 확정한 금융 원칙과 샘플 상품설명서에서 **근거가 확인된 조건만** 결정론적으로 비교하는 웹 애플리케이션이다.

이번 MVP의 성공 기준은 기능 수가 아니라 다음 흐름이 배포 URL에서 처음부터 끝까지 동작하는 것이다.

1. 사용자가 자연어로 금융 원칙을 입력한다.
2. AI가 입력을 정해진 필드로 구조화한다.
3. 불명확한 항목만 추가 질문한다.
4. 사용자가 구조화 결과를 수정하고 확정한다.
5. 사용자가 서비스에 포함된 샘플 상품 문서를 선택한다.
6. 시스템이 문서 상태와 페이지 누락 여부를 검사한다.
7. AI가 상품 조건과 근거 원문 후보를 추출한다.
8. 시스템이 원문과 페이지를 결정론적으로 다시 확인한다.
9. 규칙 엔진이 확정 원칙과 검증된 상품 조건을 비교한다.
10. 위반, 보류, 관련 조건과 원문 근거를 한 화면에 표시한다.

AI는 텍스트를 구조화하고 근거 후보를 찾는 데만 사용한다. 상품 추천, 적합성 판정, 안전성 판정, 최종 가입 결정에는 사용하지 않는다.

---

## 2. 해커톤 구현 원칙

### 2-1. 반드시 지킬 원칙

- 첫 번째 목표는 기본 데모 시나리오 하나의 완전한 수직 연결이다.
- 프론트엔드와 서버 API는 하나의 Next.js 프로젝트에서 구현한다.
- 사용자 확정 전 금융 원칙은 규칙 엔진에 전달하지 않는다.
- 상품 조건은 `값 + 근거 원문 + 페이지 + 근거 확인 여부`로 저장한다.
- 원문이나 페이지를 확인하지 못한 상품 조건은 판정에 사용하지 않는다.
- 확인할 수 없는 조건은 추측하지 않고 `HOLD`로 처리한다.
- AI 응답은 항상 Zod 스키마로 검증한 뒤 사용한다.
- 규칙 판정 함수에는 AI API 호출을 넣지 않는다.
- 실제 개인정보, 계좌정보, 금융 거래내역은 저장하지 않는다.

### 2-2. 구현하지 않을 것

- 회원가입과 로그인
- 데이터베이스
- 실제 금융상품 자동 수집
- 임의 PDF 업로드 및 범용 OCR
- 실제 금융계좌 연동
- 금융상품 추천과 종합 적합성 점수
- 수익률·손실률 예측
- 관리자 페이지
- 모바일 앱
- 복잡한 멀티에이전트 구성

---

## 3. 확정 개발 스택

| 영역 | 선택 | 사용 목적 |
| --- | --- | --- |
| 런타임 | Node.js 24 LTS | 로컬 개발과 배포 빌드 기준 |
| 언어 | TypeScript strict mode | 프론트·API·도메인 타입 공유 |
| 웹 프레임워크 | Next.js App Router | 화면과 서버 API를 한 프로젝트에서 구현 |
| UI | React + Tailwind CSS | 빠른 화면 구성과 상태 표현 |
| 런타임 검증 | Zod | 폼 입력, AI 응답, API 요청·응답 검증 |
| AI SDK | 공식 `@google/genai` JavaScript SDK | Gemini API 호출 |
| AI 출력 | `responseJsonSchema` 구조화 출력 | 자유 형식 답변 대신 고정된 구조 수신 |
| 단위 테스트 | Vitest | 스키마와 규칙 엔진 테스트 |
| 컴포넌트 테스트 | React Testing Library | 핵심 사용자 액션 테스트 |
| E2E | Playwright | 시간이 남으면 주요 시나리오 자동화 |
| 아이콘 | Lucide React | 직접 SVG를 만들지 않고 공용 아이콘 사용 |
| 배포 | Vercel | GitHub 연동 및 Next.js 배포 |
| 패키지 관리 | npm | 팀원이 별도 도구 없이 실행 가능 |

라이브러리가 제공하는 기능을 직접 재구현하지 않는다. Zod 검증, Next.js 라우팅, React 상태 관리, AI SDK 호출, 테스트 러너와 아이콘은 해당 라이브러리의 공개 API를 사용한다. 금융 규칙, 근거 검증, 단계 전환 조건처럼 SecondSign에만 존재하는 로직만 프로젝트 코드로 작성한다.

생성형 AI 제공자는 팀이 확보한 API 키에 맞춰 OpenAI에서 Google Gemini로 변경했다. AI 호출은 `src/lib/ai/client.ts` 한 파일에만 있으므로 다른 제공자로 되돌릴 때도 그 파일만 교체한다.

버전은 프로젝트 생성 시점의 안정 버전을 설치하고 `package-lock.json`으로 고정한다. 모델 이름은 코드에 직접 넣지 않고 `GEMINI_MODEL` 환경변수로 관리한다.

---

## 4. 전체 아키텍처

```text
브라우저
  ├─ 금융 원칙 입력/수정/확정
  ├─ 샘플 상품 선택
  └─ 검증 결과 표시
       │
       ├─ POST /api/principles/structure
       │    └─ Gemini API + responseJsonSchema
       │         └─ Zod 검증 → 금융 원칙 초안
       │
       └─ POST /api/products/[productId]/analyze
            ├─ 샘플 문서 manifest 및 페이지 텍스트 로드
            ├─ 페이지 누락 검사
            ├─ Gemini API + responseJsonSchema
            ├─ Zod 검증 → 상품 조건 후보
            └─ 원문/페이지 재검증 → 검증된 상품 조건

확정 금융 원칙 + 검증된 상품 조건
  └─ 순수 규칙 함수 evaluateRules
       └─ VIOLATION / HOLD / CONDITION_CONFIRMED
            └─ 결과 카드 + 원문 + 페이지
```

### 아키텍처 경계

- UI는 AI 응답 원문을 직접 사용하지 않는다.
- API Route는 외부 입력과 AI 출력을 Zod로 검증한다.
- AI 모듈은 금융 판단 상태를 만들지 않는다.
- 근거 검증 모듈은 원문 후보가 지정 페이지에 실제로 존재하는지만 검사한다.
- 규칙 엔진은 네트워크, 파일, 환경변수에 접근하지 않는 순수 함수로 작성한다.
- 결과 화면은 규칙 엔진의 결과를 변경하거나 재해석하지 않는다.

---

## 5. 사용자 화면 및 상태 흐름

한 개의 페이지에서 단계형 UI로 구현한다. 라우트 이동보다 상태 전환을 사용해 해커톤 구현량을 줄인다.

```text
INPUT
  → CLARIFYING
  → CONFIRMING
  → PRODUCT_SELECTION
  → ANALYZING
  → RESULT
```

오류 상태는 각 단계에 별도로 둔다.

- `AI_ERROR`: AI 호출 실패 또는 응답 스키마 오류
- `DOCUMENT_INCOMPLETE`: 페이지 누락 감지
- `EVIDENCE_UNVERIFIED`: 일부 조건의 원문 근거 확인 실패
- `UNKNOWN_ERROR`: 예상하지 못한 오류

### 단계별 화면

#### 1단계: 금융 원칙 입력

- 자연어 입력 textarea
- 기본 데모 문장 자동 입력 버튼
- 개인정보를 입력하지 말라는 안내
- `분석하기` 버튼

#### 2단계: 추가 확인

- AI가 생성한 질문만 표시
- 질문별 선택형 입력을 우선 사용
- 모든 질문 응답 후 다음 단계 이동

#### 3단계: 금융 원칙 확인

- 자금 목적
- 사용 예정 기간
- 원금손실 허용 여부
- 최대 허용 손실률
- 중도인출 필요 여부
- 중도인출 시 원금손실 허용 여부
- 예금자보호 필요 여부
- 수정 버튼과 `이 원칙으로 확정` 버튼

#### 4단계: 샘플 상품 선택

- 정상 상품 문서
- 최대 손실 한도 미기재 문서
- 페이지 누락 문서
- 실제 파일 업로드 버튼은 만들지 않는다.

#### 5단계: 분석 상태

- 문서 상태 확인
- 상품 조건 추출
- 원문·페이지 검증
- 금융 원칙 대조
- 네 단계의 진행 상태를 표시한다.

#### 6단계: 결과

- 확정한 금융 원칙 요약
- `원칙 위반` 카드
- `검증 보류` 카드
- `관련 조건 확인` 카드
- 카드별 근거 원문과 페이지
- “추천이나 가입 판단이 아님” 고지
- 처음부터 다시 하기 버튼

---

## 6. 핵심 데이터 계약

실제 필드명은 아래 명칭으로 고정한다. 모든 스키마는 알 수 없는 추가 필드를 거부하도록 strict 모드로 정의한다.

### 6-1. 금융 원칙 초안

```text
UserPrinciplesDraft
  purpose: string | null
  useWithinMonths: number | null
  principalLossAllowed: boolean | null
  maxLossPercent: number | null
  earlyWithdrawalRequired: boolean | null
  earlyWithdrawalPrincipalLossAllowed: boolean | null
  depositProtectionRequired: boolean | null
  clarificationQuestions: ClarificationQuestion[]
```

- 값이 `null`인 필드에는 해당 필드를 묻는 질문이 있어야 한다.
- AI가 입력에 없는 값을 추정해 채우면 안 된다.

### 6-2. 확정 금융 원칙

```text
ConfirmedUserPrinciples
  UserPrinciplesDraft의 값 필드
  confirmation: "CONFIRMED"
  confirmedAt: ISO datetime string
```

- 사용자 확인 액션을 통해서만 생성한다.
- AI API가 `CONFIRMED` 상태를 생성하면 안 된다.

### 6-3. 상품 조건과 근거

```text
ProductCondition<T>
  value: T | null
  evidence:
    quote: string
    page: positive integer
    verified: boolean
  또는 null
```

상품 조건 필드:

- `principalLossPossible: ProductCondition<boolean>`
- `maxLossPercent: ProductCondition<number>`
- `maturityMonths: ProductCondition<number>`
- `earlyRedemptionAllowed: ProductCondition<boolean>`
- `earlyRedemptionLossPossible: ProductCondition<boolean>`
- `depositProtected: ProductCondition<boolean>`

판정 가능 조건:

```text
value !== null
AND evidence !== null
AND evidence.verified === true
```

위 조건 중 하나라도 실패하면 규칙 엔진은 해당 원칙을 `HOLD`로 처리한다.

### 6-4. 검증 결과

```text
RuleResult
  principle: PrincipleKey
  status: "VIOLATION" | "HOLD" | "CONDITION_CONFIRMED"
  summary: string
  evidence: Evidence[]
```

- `VIOLATION`과 `CONDITION_CONFIRMED`에는 확인된 근거가 하나 이상 있어야 한다.
- 결과의 근거 배열에는 `verified: true`인 Evidence만 들어갈 수 있다.
- 다섯 원칙은 결과에 각각 정확히 한 번 포함되어야 한다.

---

## 7. 샘플 상품 데이터 전략

범용 PDF 업로드와 OCR은 MVP에서 제외한다. 서비스에 포함된 샘플 PDF와 페이지별 텍스트를 함께 관리한다.

### 필요한 샘플

1. `structured-note-full-loss`
   - 만기 36개월
   - 원금 일부 또는 전부 손실 가능
   - 최대 손실 100%
   - 중도환매 가능
   - 중도환매 시 원금손실 가능
   - 예금자보호 대상 아님
2. `structured-note-unknown-limit`
   - 원금손실 가능성은 명시
   - 최대 손실 비율은 문서에 없음
3. `structured-note-missing-page`
   - 기대 페이지 중 한 페이지 누락

### 저장 형식

```text
src/data/products/[productId]/manifest.json
src/data/products/[productId]/pages.json
public/products/[productId].pdf
```

`manifest.json`에는 상품명, 문서 종류, 작성일, 기대 페이지 수를 저장한다. `pages.json`에는 페이지 번호와 해당 페이지의 텍스트를 저장한다.

PDF에서 `pages.json`을 만드는 작업은 개발 준비 단계에서 한 번 수행한다. 실행 중 범용 PDF 파서를 구현하지 않는다. 이 방식은 페이지 근거를 안정적으로 재검증하고 데모 실패 가능성을 줄이기 위한 MVP 제한이다.

---

## 8. AI 처리 파이프라인

### 8-1. 금융 원칙 구조화

입력:

- 사용자가 입력한 자연어 한 문장

AI 출력 허용 범위:

- 금융 원칙 초안 필드
- 불명확한 필드 목록
- 불명확한 필드별 추가 질문

금지 사항:

- 상품 추천
- 사용자에게 없는 정보를 추정
- 사용자의 원칙을 자동 확정
- 금융 적합성·안전성 판단

처리 순서:

1. 입력 길이와 빈 문자열 검사
2. Gemini API 호출
3. `responseJsonSchema` 구조화 출력으로 결과 수신
4. Zod로 다시 검증
5. `null` 필드와 확인 질문의 일치 여부 검사
6. UI에 초안 반환

### 8-2. 상품 조건 추출

입력:

- 문서 metadata
- `[{ page, text }]` 형태의 페이지별 텍스트
- 추출 가능한 여섯 상품 조건의 명시적 목록

AI 출력 허용 범위:

- 조건 값 후보
- 해당 조건을 뒷받침하는 원문 후보
- 원문이 존재하는 페이지 번호 후보

AI는 `verified: true`를 확정할 권한이 없다. AI 출력 직후 모든 근거는 미확인 상태로 취급한다.

### 8-3. 근거 재검증

근거 확인은 AI가 아닌 프로젝트 코드에서 수행한다.

1. AI가 반환한 페이지가 실제 페이지 범위 안인지 검사한다.
2. 원문과 페이지 텍스트의 연속 공백·줄바꿈을 정규화한다.
3. 정규화된 원문이 지정 페이지 텍스트에 실제로 포함되는지 검사한다.
4. 포함되면 `verified: true`로 변경한다.
5. 확인하지 못하면 `verified: false`로 유지한다.
6. 검증 실패 원인을 개발 로그에 남기되 사용자 원문 전체는 로그에 남기지 않는다.

`normalizeWhitespace`, 페이지 범위 검사, 원문 포함 검사는 SecondSign 전용 프로젝트 함수로 구현한다. 문자열 탐색에는 JavaScript가 제공하는 `String.prototype.includes`를 사용하며 동일 기능을 직접 다시 구현하지 않는다.

### 8-4. AI 실패 처리

- API 제한시간은 20초로 둔다.
- 네트워크 오류는 서버에서 한 번만 재시도한다.
- 스키마 오류는 재시도하지 않고 사용자에게 다시 분석 버튼을 제공한다.
- API 키는 서버 환경변수에서만 읽고 브라우저로 전달하지 않는다. 읽는 지점은 `src/lib/config.ts` 하나로 제한한다.
- 개발·테스트용 fixture 모드를 제공하되, 배포 화면에서 fixture 결과를 실제 AI 결과처럼 숨기지 않는다.

---

## 9. 결정론적 규칙 엔진

함수 계약:

```text
evaluateRules(
  principles: ConfirmedUserPrinciples,
  terms: ProductTerms
): RuleResult[]
```

공통 선행 조건:

- 상품 값이 `null`이면 `HOLD`
- Evidence가 없으면 `HOLD`
- Evidence가 `verified: false`이면 `HOLD`
- 사용자 원칙 값이 미확정이면 `HOLD`
- 위 조건을 모두 통과한 뒤에만 숫자 또는 boolean을 비교한다.

### 판정 규칙

| 원칙 | 위반 조건 | 관련 조건 확인 조건 |
| --- | --- | --- |
| `principalLoss` | 사용자가 손실을 불허하고 상품은 손실 가능 | 그 외 확인된 조합 |
| `lossLimit` | 상품 최대 손실률이 사용자 한도보다 큼 | 상품 최대 손실률이 사용자 한도 이하 |
| `liquidityHorizon` | 상품 만기가 사용자 사용 예정 기간보다 김 | 상품 만기가 사용 예정 기간 이하 |
| `earlyRedemption` | 중도인출이 필요한데 환매 불가, 또는 환매 손실 불허인데 손실 가능 | 중도환매 가능 여부와 손실 조건이 사용자 원칙에 부합 |
| `depositProtection` | 사용자가 보호를 요구하지만 상품은 보호 대상이 아님 | 그 외 확인된 조합 |

`earlyRedemption`은 중도환매 가능 여부와 중도환매 손실 가능 여부를 모두 확인한다. 둘 중 필요한 조건 하나라도 근거가 없으면 `HOLD`로 처리한다.

규칙 함수는 다음 특성을 유지한다.

- 동기 순수 함수
- 동일 입력에 항상 동일 출력
- 외부 API 호출 없음
- 시스템 시간 참조 없음
- 예외를 판정으로 숨기지 않음
- 다섯 개의 개별 규칙 함수를 `evaluateRules`에서 고정 순서로 조합

---

## 10. API 계약

### `POST /api/principles/structure`

요청:

```json
{
  "input": "1년 뒤 전세자금으로 사용할 돈이고 원금 손실은 원하지 않습니다."
}
```

성공 응답:

```text
200
{
  draft: UserPrinciplesDraft
}
```

오류:

- `400`: 빈 입력 또는 길이 제한 초과
- `422`: AI 결과가 스키마에 맞지 않음
- `502`: AI API 실패

### `POST /api/products/[productId]/analyze`

요청 본문은 없다. URL의 `productId`는 서버의 허용 목록과 일치해야 한다.

성공 응답:

```text
200
{
  status: DocumentStatus
  terms: ProductTerms
}
```

오류:

- `404`: 존재하지 않는 샘플 상품
- `409`: 페이지 누락 문서
- `422`: AI 결과 또는 근거 검증 구조 오류
- `502`: AI API 실패

### 규칙 검증

별도 API를 만들지 않는다. 검증된 `ConfirmedUserPrinciples`와 `ProductTerms`를 공유 순수 함수에 전달한다. API를 하나 더 만들지 않아 구현량과 실패 지점을 줄인다.

---

## 11. 권장 프로젝트 구조

```text
src/
  app/
    api/
      principles/structure/route.ts
      products/[productId]/analyze/route.ts
    page.tsx
    layout.tsx
    globals.css
  components/
    principle-input.tsx
    clarification-form.tsx
    principle-confirmation.tsx
    product-selector.tsx
    analysis-progress.tsx
    verification-result.tsx
    evidence-panel.tsx
  lib/
    domain/
      schemas.ts
      types.ts
    ai/
      client.ts
      structure-principles.ts
      extract-product-terms.ts
      prompts.ts
    evidence/
      verify-evidence.ts
    rules/
      evaluate-rules.ts
      principal-loss.ts
      loss-limit.ts
      liquidity-horizon.ts
      early-redemption.ts
      deposit-protection.ts
    products/
      repository.ts
  data/
    products/
      structured-note-full-loss/
      structured-note-unknown-limit/
      structured-note-missing-page/
public/
  products/
tests/
  unit/
  integration/
  e2e/
docs/
  FUNCTIONAL_SPECIFICATION.md
  DEVELOPMENT_SPECIFICATION.md
```

초기에는 파일을 지나치게 쪼개지 않는다. 한 파일이 약 200줄을 넘거나 서로 다른 책임이 섞일 때 분리한다.

---

## 12. 단계별 개발 가이드

총 구현 시간 목표는 약 7~9시간이다. 시간이 부족하면 각 단계의 “완료 조건”만 만족하고 다음 단계로 넘어간다.

### 0단계. 프로젝트 생성과 화면 뼈대 — 30분

작업:

- Next.js App Router 프로젝트 생성
- TypeScript strict, Tailwind, ESLint 활성화
- 기본 단일 페이지와 단계 표시 영역 작성
- `.env.example`에 `GEMINI_API_KEY`, `GEMINI_MODEL` 선언
- GitHub 저장소 연결 확인

완료 조건:

- `npm run dev` 실행
- 첫 화면 렌더링
- API 키가 클라이언트 번들에 포함되지 않음

### 1단계. 도메인 스키마 — 45분

작업:

- 금융 원칙 초안과 확정 타입
- 상품 조건과 Evidence 타입
- 문서 상태 타입
- RuleResult 타입
- Zod 검증 실패 테스트

완료 조건:

- 잘못된 퍼센트와 페이지 번호 거부
- 상품 값이 있는데 Evidence가 없는 구조 거부 또는 미검증 상태 처리
- 확정 금융 원칙과 초안 타입 분리

### 2단계. fixture 기반 수직 슬라이스 — 90분

작업:

- 기본 데모 입력 고정 데이터 작성
- 정상 상품의 페이지 텍스트와 조건 fixture 작성
- 다섯 규칙 함수 구현
- 결과 카드 연결
- 이 단계에서는 AI API를 호출하지 않는다.

완료 조건:

- 시나리오 1이 입력부터 결과까지 동작
- 모든 위반 카드에 원문과 페이지 표시
- 새로고침 전까지 한 번의 데모 흐름 유지

### 3단계. 금융 원칙 AI 구조화 — 60분

작업:

- `/api/principles/structure` 구현
- 금융 원칙 전용 프롬프트 작성
- 구조화 출력(`responseJsonSchema`) 연결
- Zod 검증
- 추가 질문 UI 연결
- 사용자 수정 및 확정 처리

완료 조건:

- 기본 문장을 기대 필드로 구조화
- 예금자보호 미입력 시 해당 질문만 표시
- 사용자가 확정하기 전 상품 선택 단계로 이동 불가

### 4단계. 상품 분석과 근거 확인 — 90분

작업:

- 샘플 상품 repository 구현
- 문서 누락 검사
- 상품 조건 추출 API 구현
- 원문과 페이지 재검증
- 미기재 조건을 `null`로 유지

완료 조건:

- 정상 문서의 여섯 조건과 근거 반환
- 손실 한도 미기재 문서에서 해당 조건 `HOLD`
- 누락 문서에서 분석 중단 및 경고 표시

### 5단계. 전체 UI와 오류 처리 — 90분

작업:

- 단계별 로딩 상태
- 재시도와 처음부터 다시 하기
- 결과 상태별 시각 구분
- 근거 펼침 패널
- 금융 판단이 아니라는 고지
- 데스크톱 Chrome/Edge 확인

완료 조건:

- 사용자에게 빈 화면이나 원시 오류 메시지가 노출되지 않음
- 결과 카드에서 근거를 한 번의 클릭으로 확인
- 키보드로 주요 버튼 접근 가능

### 6단계. 테스트와 배포 — 90분

작업:

- 규칙 단위 테스트
- AI API mock 통합 테스트
- 기능명세서 시나리오 1~3 테스트
- 문서 누락 예외 테스트
- Vercel 환경변수 설정과 배포
- 실제 배포 URL smoke test

완료 조건:

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` 통과
- 배포 URL에서 기본 데모 완료
- API 키가 저장소와 브라우저 응답에 노출되지 않음

---

## 13. 테스트 명세

### 필수 단위 테스트

- 원금손실 불허 + 상품 손실 가능 → `VIOLATION`
- 상품 손실 조건 근거 미확인 → `HOLD`
- 사용자 한도 10% + 상품 최대 손실 30% → `VIOLATION`
- 사용자 한도 10% + 상품 최대 손실 미기재 → `HOLD`
- 자금 사용 12개월 + 상품 만기 36개월 → `VIOLATION`
- 중도인출 필요 + 상품 환매 불가 → `VIOLATION`
- 환매 손실 불허 + 상품 환매 손실 가능 → `VIOLATION`
- 예금자보호 필요 + 보호 대상 아님 → `VIOLATION`
- 조건 값이 `null` → `HOLD`
- Evidence 없음 → `HOLD`
- Evidence `verified: false` → `HOLD`
- 비보류 결과의 Evidence가 모두 `verified: true`

### 필수 통합 테스트

- AI 구조화 응답이 Zod 스키마를 통과하면 초안 반환
- AI 구조화 응답이 스키마와 다르면 `422`
- 상품 추출 원문이 지정 페이지에 있으면 근거 확인
- 원문이 지정 페이지에 없으면 미확인 처리
- 누락 페이지 문서는 AI 호출 전에 중단

### 수동 데모 테스트

- 기능명세서 시나리오 1
- 기능명세서 시나리오 2
- 기능명세서 시나리오 3
- 페이지 누락 예외 시나리오

---

## 14. 환경변수 및 보안

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
USE_FIXTURE_MODE=false
```

- `.env.local`은 Git에 올리지 않는다.
- API 키는 Route Handler에서만 사용한다.
- 브라우저에 키 또는 원시 AI 응답을 전달하지 않는다.
- 요청 로그에 사용자의 전체 자연어 입력을 남기지 않는다.
- 실제 개인정보 입력을 금지하는 문구를 입력 화면에 표시한다.
- 샘플 상품 ID는 서버의 허용 목록으로 검사해 임의 파일 경로 접근을 막는다.

---

## 15. 실패 대응 및 데모 안정성

| 실패 | 처리 |
| --- | --- |
| AI API 실패 | 오류 안내와 다시 시도 버튼 표시 |
| AI 응답 스키마 오류 | 원시 응답을 사용하지 않고 분석 실패 처리 |
| 상품 조건 미기재 | 해당 원칙만 `HOLD` |
| 근거 원문 불일치 | `verified: false`, 해당 원칙 `HOLD` |
| 페이지 누락 | 전체 상품 검증 중단 |
| 환경변수 누락 | 서버 시작 또는 첫 API 호출에서 명확한 설정 오류 표시 |
| 데모 중 외부 API 장애 | 명시적인 fixture 모드로 전환하고 화면에 샘플 결과임을 표시 |

---

## 16. 개발 진행 방향

앞으로 구현할 때 다음 순서를 유지한다.

1. 기능명세서의 기본 시나리오를 fixture로 먼저 완성한다.
2. 도메인 스키마와 규칙 엔진을 고정한다.
3. UI를 fixture에 연결해 전체 사용자 흐름을 확인한다.
4. 금융 원칙 구조화 AI만 실제 API로 교체한다.
5. 상품 조건 추출 AI를 실제 API로 교체한다.
6. 근거 검증 실패와 문서 누락 경로를 연결한다.
7. 마지막에 디자인을 정리하고 배포한다.

구현 우선순위는 다음과 같다.

```text
정확한 상태 전환
  > 근거 확인 가능성
  > 기본 시나리오 완주
  > 오류 복구
  > 시각 디자인
  > 부가 기능
```

개발 중 기능명세서와 개발명세서가 충돌하면 금융 기능의 범위는 기능명세서를 우선하고, 기술 구현 방식은 이 개발명세서를 우선한다.

---

## 17. MVP 완료 정의

다음 항목이 모두 충족되면 MVP 개발 완료로 본다.

- 회원가입 없이 배포 URL 접속 가능
- 기본 자연어 입력 제공
- AI 구조화와 추가 질문 동작
- 사용자 수정·확정 동작
- 세 종류 샘플 상품 선택 가능
- 문서 완전성 검사 동작
- 여섯 상품 조건과 원문·페이지 연결
- 미확인 근거가 규칙 판정에서 제외됨
- 다섯 금융 원칙 규칙 결과 생성
- 위반·보류·관련 조건을 분리해 표시
- 모든 비보류 결과에서 원문과 페이지 확인 가능
- 금융 추천이나 종합 적합성 판단을 제공하지 않음
- 기능명세서의 세 시나리오와 한 예외 시나리오 통과
- lint, 타입 검사, 테스트, 프로덕션 빌드 통과
- Vercel 배포 URL에서 smoke test 통과

---

## 18. 공식 기술 문서

- [Next.js App Router](https://nextjs.org/docs/app/getting-started)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript)
- [Gemini API 구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini API JavaScript SDK](https://googleapis.github.io/js-genai/)
- [Vercel의 Next.js 배포](https://vercel.com/frameworks/nextjs)
