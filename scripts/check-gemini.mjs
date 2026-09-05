/**
 * Gemini 연결 진단 스크립트.
 *
 * 실행: npm run check:gemini
 *
 * 앱을 거치지 않고 Gemini API를 직접 두드려서, 실패 원인이
 * 키인지 · 모델명인지 · 응답 스키마인지 셋 중 어디인지 갈라준다.
 * 구글이 돌려준 오류 원문을 그대로 출력한다.
 */

import { GoogleGenAI } from "@google/genai";

/**
 * 아래 두 상수는 src/lib/ai/prompts.ts 의 사본이다.
 * 이 스크립트는 앱을 거치지 않고 단독 실행돼야 해서 경로 별칭(@/)을 쓸 수 없다.
 * prompts.ts 를 고치면 여기도 같이 고쳐야 한다.
 */
const PRINCIPLE_FIELDS = [
  "purpose",
  "useWithinMonths",
  "principalLossAllowed",
  "maxLossPercent",
  "earlyWithdrawalRequired",
  "earlyWithdrawalPrincipalLossAllowed",
  "depositProtectionRequired",
];

const STRUCTURE_PRINCIPLES_INSTRUCTION = `너는 금융 문서를 구조화하는 도구다.
주어진 텍스트에 명시적으로 없는 내용은 절대로 만들어 내지 않는다.
상품 추천, 적합성 판단, 안전성 판단, 수익률 예측을 하지 않는다.
확실하지 않으면 값을 채우지 말고 비워 둔다.
사용자가 말하지 않은 항목은 필드를 아예 포함하지 않는다.
값을 넣을 수 없는 항목마다 clarifications 배열에 확인 질문을 하나씩 넣는다.`;

const STRUCTURE_PRINCIPLES_SCHEMA = {
  type: "object",
  properties: {
    purpose: { type: "string" },
    useWithinMonths: { type: "integer", minimum: 1, maximum: 600 },
    principalLossAllowed: { type: "boolean" },
    maxLossPercent: { type: "number", minimum: 0, maximum: 100 },
    earlyWithdrawalRequired: { type: "boolean" },
    earlyWithdrawalPrincipalLossAllowed: { type: "boolean" },
    depositProtectionRequired: { type: "boolean" },
    clarifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", enum: PRINCIPLE_FIELDS },
          question: { type: "string" },
        },
        required: ["field", "question"],
        additionalProperties: false,
        propertyOrdering: ["field", "question"],
      },
    },
  },
  required: ["clarifications"],
  additionalProperties: false,
  propertyOrdering: [...PRINCIPLE_FIELDS, "clarifications"],
};

const KEY = process.env.GEMINI_API_KEY?.trim();
const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const line = (char = "─") => console.log(char.repeat(62));
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const bad = (msg) => console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
const info = (msg) => console.log(`    ${msg}`);

line("=");
console.log(" Gemini 연결 진단");
line("=");

async function main() {

/* 0. 환경변수 --------------------------------------------------------- */

console.log("\n[0] 환경변수");

if (!KEY) {
  bad("GEMINI_API_KEY 를 읽지 못했습니다.");
  info(".env.local 파일이 프로젝트 맨 위에 있는지,");
  info("GEMINI_API_KEY= 뒤에 값이 붙어 있는지 확인하세요.");
  return 1;
}

ok(`키를 읽었습니다 (${KEY.slice(0, 6)}… 총 ${KEY.length}자)`);
ok(`모델: ${MODEL}`);

if (KEY.length < 30) {
  info("\x1b[33m주의: 키가 짧습니다. 일부만 붙여넣지 않았는지 확인하세요.\x1b[0m");
}

/* 1. 키가 유효한가 ---------------------------------------------------- */

console.log("\n[1] 키가 유효한지 — 모델 목록 조회");

let available = [];
try {
  const res = await fetch(`${BASE}/models?key=${KEY}&pageSize=200`);
  const body = await res.json();

  if (!res.ok) {
    bad(`HTTP ${res.status}`);
    info(JSON.stringify(body?.error ?? body, null, 2).split("\n").join("\n    "));
    console.log("\n  → 키가 거부됐습니다.");
    if (body?.error?.status === "UNAUTHENTICATED") {
      info("AQ. 또는 AIza 형식 모두 AI Studio에서 발급될 수 있습니다.");
      info("aistudio.google.com/apikey 에서 키 상태·유형·연결 프로젝트를 확인하세요.");
    } else {
      info("· 키가 살아 있는지, 새로 발급한 뒤 .env.local 을 고쳤는지");
      info("· 키 앞뒤에 공백이나 따옴표가 붙지 않았는지");
    }
    return 1;
  }

  available = (body.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""));

  ok(`키가 유효합니다. 사용 가능한 모델 ${available.length}개`);

  const hits = available.filter((m) => m.startsWith("gemini")).slice(0, 12);
  info("예: " + hits.join(", "));

  if (!available.includes(MODEL)) {
    bad(`\x1b[33m'${MODEL}' 은 이 계정에서 쓸 수 없습니다.\x1b[0m`);
    const suggestion =
      available.find((m) => m === "gemini-3.6-flash") ??
      available.find((m) => /^gemini-.*flash$/.test(m)) ??
      available[0];
    info(`→ .env.local 의 GEMINI_MODEL 을 '${suggestion}' 으로 바꾸세요.`);
  } else {
    ok(`'${MODEL}' 사용 가능`);
  }
} catch (error) {
  bad("네트워크 오류로 구글에 닿지 못했습니다.");
  info(String(error?.message ?? error));
  info("사내망·학교망 방화벽이나 VPN이 막고 있을 수 있습니다.");
  return 1;
}

/* 2. 가장 단순한 호출 -------------------------------------------------- */

console.log("\n[2] 가장 단순한 호출 — 스키마 없이 한 문장");

const ai = new GoogleGenAI({ apiKey: KEY });

try {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: "한국어로 '연결 성공' 이라고만 답하라.",
  });
  ok(`응답: ${JSON.stringify(res.text?.trim())}`);
} catch (error) {
  bad("단순 호출부터 실패했습니다.");
  info(String(error?.message ?? error));
  console.log("\n  → 스키마 문제가 아니라 모델·권한 문제입니다.");
  info("[1]에서 안내한 모델 이름으로 바꿔서 다시 실행해 보세요.");
  return 1;
}

/* 3. 실제로 쓰는 구조화 출력 ------------------------------------------- */

console.log("\n[3] 실제 호출 — 앱이 쓰는 JSON 스키마 그대로");

try {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: '다음 문장을 구조화하라.\n\n"""\n1년 뒤 전세자금으로 사용할 돈이고 원금 손실은 원하지 않습니다.\n"""',
    config: {
      systemInstruction: STRUCTURE_PRINCIPLES_INSTRUCTION,
      responseMimeType: "application/json",
      responseJsonSchema: STRUCTURE_PRINCIPLES_SCHEMA,
      temperature: 0,
    },
  });

  const text = res.text?.trim();
  if (!text) {
    bad("응답이 비어 있습니다.");
    info(JSON.stringify(res, null, 2).slice(0, 1200));
    return 1;
  }

  const parsed = JSON.parse(text);
  ok("구조화 출력 성공");
  console.log(JSON.stringify(parsed, null, 2).split("\n").map((l) => "    " + l).join("\n"));

  line("=");
  console.log(" 전부 통과했습니다. 앱에서도 동작해야 합니다.");
  console.log(" npm run dev 로 다시 확인해 보세요.");
  line("=");
  return 0;
} catch (error) {
  bad("구조화 출력에서 실패했습니다.");
  info(String(error?.message ?? error));
  console.log("\n  → [2]는 됐는데 여기서 막혔다면 스키마 문제입니다.");
  info("src/lib/ai/prompts.ts 에서 propertyOrdering 줄들을 지우고");
  info("다시 실행해 보세요. 위 오류 원문을 저에게 보내주셔도 됩니다.");
  return 1;
}
}

// exitCode 만 세팅하고 자연스럽게 끝낸다.
// process.exit 로 즉시 끊으면 윈도우에서 출력이 잘리며 libuv 오류가 난다.
process.exitCode = await main();
