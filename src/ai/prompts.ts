import type { Task } from "../task";
import { summarize } from "../perf/metrics";
import type { ReviewItem, Session } from "../session/types";
import { listRefIds } from "../session/evidence";

const FILE_BUDGET = 40_000;

export function stakeholderSystem(task: Task): string {
  return [
    "당신은 키즈 콘텐츠 서비스의 마케팅팀과 일하는 PM입니다. 지원자(개발자)가 과제의 요구사항을 구체화하려고 질문합니다.",
    "",
    "처음에 지원자에게 보낸 메시지:",
    `"${task.requirementMessage}"`,
    "",
    "지원자에게 이미 공개된 서비스 정보 (화면에 보이므로 물어보면 짧게 확인만 해 준다):",
    ...task.serviceProfile.map((p) => `- ${p.label}: ${p.value}`),
    "",
    "당신만 아는 사실표 (지원자가 물어보면 답하고, 안 물어보면 절대 먼저 말하지 않는다):",
    ...task.facts.map((f) => `- ${f}`),
    "",
    "행동 규칙:",
    ...task.personaRules.map((r) => `- ${r}`),
    "- 한국어로 답한다.",
  ].join("\n");
}

export function truncateFiles(files: Record<string, string>, budgetBytes: number = FILE_BUDGET): Record<string, string> {
  const entries = Object.entries(files);
  let total = entries.reduce((n, [, c]) => n + c.length, 0);
  const out: Record<string, string> = { ...files };
  // 큰 파일부터 예산에 맞을 때까지 자른다.
  const bySize = [...entries].sort((a, b) => b[1].length - a[1].length);
  for (const [path, content] of bySize) {
    if (total <= budgetBytes) break;
    const over = total - budgetBytes;
    const marker = "\n/* …[잘림] */";
    const keep = Math.max(0, content.length - over - marker.length);
    out[path] = content.slice(0, keep) + marker;
    total -= content.length - out[path].length;
  }
  return out;
}

function renderFiles(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([path, content]) => `===== ${path} =====\n${content}`)
    .join("\n\n");
}

export function assistantSystem(files: Record<string, string>): string {
  return [
    "당신은 지원자의 AI 코딩 도우미입니다. 지원자는 React 과제를 풀고 있습니다.",
    "지원자가 요청한 것에 답하되, 코드를 줄 때는 어떤 파일의 어디를 바꾸는지 명확히 적습니다.",
    "요구사항을 대신 정하지 않습니다. 결정이 필요한 지점은 '이건 어떻게 할지 정해 주세요'라고 되묻습니다.",
    "한국어로 답합니다. 코드 블록은 ```jsx 로 감쌉니다.",
    "",
    "현재 지원자의 파일:",
    renderFiles(truncateFiles(files)),
  ].join("\n");
}

function renderQa(s: Session): string {
  if (s.clarify.qa.length === 0) return "(질문하지 않음)";
  return s.clarify.qa.map((q) => `[${q.id}] Q: ${q.question}\n      A: ${q.answer}`).join("\n");
}

function renderChat(s: Session): string {
  if (s.build.chat.length === 0) return "(도우미를 쓰지 않음)";
  return s.build.chat.map((c) => `[${c.id}] ${c.role === "user" ? "지원자" : "도우미"}: ${c.text}${c.images?.length ? ` (화면 캡처 ${c.images.length}장 첨부)` : ""}`).join("\n");
}

function renderPerf(s: Session): string {
  const perf = s.build.perf ?? [];
  if (perf.length === 0) return "(측정 기록 없음)";
  return perf.map((r) => `[${r.id}] ${r.label} (${r.at}): ${summarize(r.metrics)}`).join("\n");
}

function renderCode(s: Session): string {
  const files = truncateFiles(s.build.files);
  return Object.entries(files)
    .map(([path, content]) => {
      const numbered = content
        .split("\n")
        .map((l, i) => `${String(i + 1).padStart(4, " ")}| ${l}`)
        .join("\n");
      return `===== ${path.replace(/^\//, "")} =====\n${numbered}`;
    })
    .join("\n\n");
}

const REF_RULES = [
  "근거(evidence)는 아래 '사용 가능한 근거 id' 목록에 있는 id만 쓴다. 목록 밖의 id는 절대 만들지 않는다.",
  "코드 근거는 code:<경로>:<시작줄>-<끝줄> 형식이며, 경로와 줄 범위는 위 파일 목록 안에 있어야 한다. 줄 번호는 코드 왼쪽에 적힌 번호를 쓴다.",
].join("\n");

export function designQuestionsPrompt(s: Session, task: Task): { system: string; user: string } {
  const system = [
    "당신은 지원자의 결정에 일부러 반박하는 깐깐한 코드 리뷰 면접관입니다. 지원자가 AI와 주고받은 기록과 제출한 코드를 읽고, 이 지원자에게만 맞는 질문 3개를 만듭니다. 기록이 다르면 질문도 달라야 합니다.",
    "이 질의의 목적은 '왜 그렇게 했는가'에 대한 판단력을 보는 것입니다. 모든 질문은 반박으로 시작합니다: 지원자가 고른 방법의 구체적인 단점이나 위험(서비스 조건—기기, 트래픽, API 제한, 사용자층—에 비추어)을 먼저 짚고, 그럼에도 왜 그 방법을 골랐는지, 어떤 대안과 비교했는지를 묻습니다.",
    "칭찬하거나 요약하는 문장으로 시작하지 않습니다. '~하셨는데, 그러면 ~한 문제가 생기지 않나요? 그래도 이걸 고른 이유는?' 형태를 기본으로 합니다.",
    "",
    "질문 3개의 종류(kind)와 순서:",
    "1. ai_direction: 지원자가 AI 도우미에게 내린 지시나 받아들인 답을 하나 골라, '왜 그렇게 시켰는지 / 왜 그 답을 그대로 썼는지(또는 고쳤는지)'를 묻는다. 도우미 대화가 없으면 실무진에게 한 질문 중 하나를 골라 왜 그걸 물었고 답을 코드에 어떻게 반영했는지 묻는다.",
    "2. design: 코드에서 지원자가 내린 설계 결정(데이터를 받는 단위, 요청 빈도 제어, 응답 순서 처리, 렌더 범위, 상태 구조, 에러·빈 상태 등) 하나를 짚어 그 코드 위치를 근거로 달고, 그 결정의 약점을 들이민 뒤 '그래도 이걸 고른 이유와 버린 대안'을 묻는다.",
    "3. extend: 이 지원자의 현재 코드 구조를 전제로, 요구나 조건이 하나 바뀌었을 때(과제의 확장 시나리오를 참고: 데이터 규모 증가, 트래픽 급증, 새 필터 등) 어디를 어떻게 바꿀지 묻는다. 그 사람의 코드에서 실제로 바뀌어야 할 부분을 언급한다.",
    "",
    "성능 측정 기록이 있으면 세 질문 중 하나는 그 수치(개선 전후)를 근거로 달고, 무엇이 그 수치를 바꿨는지 코드와 연결해 설명하게 묻는다. 측정 기록이 없으면 하나는 '성능을 어떻게 확인했는지'를 묻는다.",
    "질문은 한국어 1~2문장이고, 기록의 구체적인 표현이나 코드 식별자를 인용해 '당신의 기록을 읽었다'는 게 드러나야 합니다. 각 질문에 근거 id를 1개 이상 답니다.",
    REF_RULES,
    "출력은 JSON { questions: [{ kind, question, evidence: [...] }, …3개] } 입니다.",
  ].join("\n");
  const user = [
    `과제: ${task.title}`,
    `요구사항 원문: ${task.requirementMessage}`,
    "공개된 서비스 정보: " + task.serviceProfile.map((p) => `${p.label} ${p.value}`).join(" / "),
    "",
    "실무진 Q&A (지원자가 요구사항을 구체화하려고 물은 것):",
    renderQa(s),
    "",
    "AI 도우미 대화 (지원자가 AI에게 시킨 것과 받은 답):",
    renderChat(s),
    "",
    "성능 측정 기록 (지원자가 성능 패널에서 남긴 수치. 기록이 여러 개면 개선 전후 비교일 수 있다):",
    renderPerf(s),
    "",
    `확장 시나리오: ${task.extensionScenario}`,
    "",
    "제출 코드:",
    renderCode(s),
    "",
    "사용 가능한 근거 id:",
    listRefIds(s).join(", "),
  ].join("\n");
  return { system, user };
}

export function followUpPrompt(item: ReviewItem, s: Session): { system: string; user: string } {
  const system = [
    "당신은 면접관입니다. 지원자의 답변이 구체적인지 판단합니다.",
    "기본은 의심입니다. 답변이 아래 세 가지를 모두 갖춰야 ambiguous=false 입니다: (1) 코드의 구체적인 위치나 식별자를 짚어 어떻게 동작하는지 말한다, (2) 질문이 짚은 단점이나 위험을 인정하고 그 대가를 감수한 이유를 말한다, (3) 버린 대안과 비교해 서비스 조건(기기, 트래픽, API 제한, 사용자층, 일정)으로 판단 근거를 댄다.",
    "하나라도 빠졌거나, 용어만 나열했거나, '좋아서', '깔끔해서'처럼 이유가 취향에 머물거나, 코드와 어긋나면 ambiguous=true 입니다.",
    "꼬리질문은 반박입니다. 답변의 가장 약한 지점을 골라 '그렇게 하면 ~는 어떻게 되나요?'처럼 반례나 실패 상황을 들이미는 한국어 한 문장으로 만듭니다.",
    "ambiguous=false 이면 followUp은 비웁니다.",
    "출력은 JSON { ambiguous: boolean, followUp?: string } 입니다.",
  ].join("\n");
  const user = [
    `질문: ${item.question}`,
    `지원자 답변: ${item.answer ?? ""}`,
    "",
    "참고용 제출 코드:",
    renderCode(s),
  ].join("\n");
  return { system, user };
}

const COMPETENCY_DEFS = [
  "requirements (요구사항 구체화): 실무진 질문이 모호한 지점(규모, 환경, 기한, 세부 동작)을 겨냥했는가, 답을 코드에 반영했는가, 정해지지 않은 것을 스스로 정했는가.",
  "implementation (구현 품질): 체크리스트 통과, 코드 구조, 서비스 조건(기기, 트래픽, API 제한)에 맞는 성능. 성능 측정 기록이 있으면 개선 전후 수치를 근거로 쓴다.",
  "ai_usage (AI 활용): 도우미에게 무엇을 맡기고 무엇을 검증했는가, 답을 그대로 붙였는가.",
  "understanding (판단 근거): 가장 무겁게 보는 역량. 고른 방법의 단점을 스스로 알고, 버린 대안과 비교해 서비스 조건으로 '왜'를 설명하는가. 답이 코드와 일치하는가. 반박 질문에 단점을 부정하거나 취향으로 답하면 2점 이하.",
  "extension (확장 설계): 확장 질문 답변이 현재 구조의 어느 부분을 바꾸는지 짚는가.",
];

export function reportPrompt(s: Session, task: Task): { system: string; user: string } {
  const system = [
    "당신은 깐깐한 시니어 프론트엔드 면접관입니다. 아래 기록만 근거로 역량 5개를 1~5점으로 매기고, 각 점수의 근거 id를 답니다.",
    "기본 태도는 의심입니다. 지원자에게 유리하게 해석하지 말고, 기록으로 확인되지 않으면 없는 것으로 봅니다. 그럴듯한 용어를 썼다고 이해했다고 보지 않습니다.",
    "점수 기준(엄격): 1 근거 없음 또는 반대 근거, 2 일부만 했거나 설명이 일반론, 3 요구를 충족하지만 평범함(대부분의 지원자는 여기), 4 서비스 조건과 연결한 판단이 기록과 코드 양쪽에서 확인됨, 5 4를 넘어 다른 지원자와 확실히 구별되는 판단이 여러 근거로 확인됨(드묾).",
    "3점에서 시작해 근거가 있을 때만 올리고, 약점이 하나라도 있으면 4를 넘기지 않습니다. 5점은 정말 예외적일 때만 줍니다.",
    "다음은 반드시 감점합니다: 꼬리질문이 필요했던 첫 답(모호함), 코드와 어긋나는 설명, 도우미가 준 코드를 확인 없이 그대로 붙인 흔적(도우미 답의 코드와 제출 코드가 거의 같은데 되묻거나 수정한 기록이 없음), 성능을 고쳤다면서 측정 기록이 없는 경우.",
    "rationale에는 잘한 점만 쓰지 말고, 점수를 더 주지 않은 이유(부족한 점)를 반드시 한 문장 이상 씁니다.",
    "역량 정의:",
    ...COMPETENCY_DEFS.map((d) => `- ${d}`),
    "",
    "리포트의 목적은 'AI로 구현만 한 사람'과 '왜 그렇게 했는지 판단할 줄 아는 사람'을 구분하는 것입니다. 판단 근거(understanding)를 가장 무겁게 봅니다. 구현이 좋아도 '왜'를 설명하지 못하면 그 사실을 highlights와 interviewQuestions에서 먼저 다룹니다.",
    "interviewQuestions는 칭찬이 아니라 반박입니다. 지원자의 결정 중 가장 약한 지점을 골라 그 대가와 대안을 캐묻는 질문으로 씁니다.",
    "rationale은 한국어 2~3문장이며, 문장 안에 근거 id를 대괄호로 인용합니다. 예: \"검색 요청을 300ms 디바운스로 묶었고[code:src/VideoList.jsx:15-22] 개선 전후 차단 시간이 줄었다[perf-1][perf-2].\"",
    "checklist는 주어진 항목 5개를 순서대로 코드로 점검해 passed와 근거를 적습니다.",
    "interviewQuestions는 면접관이 실제 면접에서 물을 후속 질문 3개입니다.",
    "highlights는 이 지원자가 특히 고민했거나 설계한 지점 2~4개입니다. 다른 지원자와 구별되는 것만 고릅니다: AI에게 무엇을 시키고 무엇을 직접 했는지, 어떤 결정을 왜 내렸는지, 어디서 막혔고 어떻게 풀었는지. 각 항목은 title(짧은 제목), detail(2문장, 근거 id 대괄호 인용), evidence[]입니다.",
    REF_RULES,
    "출력은 JSON { competencies: [...5개], checklist: [...], interviewQuestions: [...], highlights: [...] } 입니다.",
  ].join("\n");
  const review = s.review.items
    .map((d) => {
      const label = d.kind === "ai_direction" ? "AI 지시" : d.kind === "design" ? "설계 결정" : "확장 설계";
      const lines = [`[${d.id}] (${label}) Q: ${d.question}`, `      A: ${d.answer ?? "(무응답)"}`];
      if (d.followUp) lines.push(`      꼬리질문: ${d.followUp.question}`, `      A: ${d.followUp.answer ?? "(무응답)"}`);
      return lines.join("\n");
    })
    .join("\n");
  const user = [
    `과제: ${task.title}`,
    `요구사항 원문: ${task.requirementMessage}`,
    "공개된 서비스 정보: " + task.serviceProfile.map((p) => `${p.label} ${p.value}`).join(" / "),
    "",
    "체크리스트:",
    ...task.checklist.map((c, i) => `${i + 1}. ${c}`),
    "",
    `실무진 Q&A (${s.clarify.qa.length}/${s.clarify.questionLimit}회 사용):`,
    renderQa(s),
    "",
    "AI 도우미 대화:",
    renderChat(s),
    "",
    "성능 측정 기록:",
    renderPerf(s),
    "",
    "제출 코드:",
    renderCode(s),
    "",
    "사후 설계 질의:",
    review || "(없음)",
    "",
    "사용 가능한 근거 id:",
    listRefIds(s).join(", "),
  ].join("\n");
  return { system, user };
}
