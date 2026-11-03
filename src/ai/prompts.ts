import type { Task } from "../task/bannerSchedule";
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
  return s.build.chat.map((c) => `[${c.id}] ${c.role === "user" ? "지원자" : "도우미"}: ${c.text}`).join("\n");
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
    "당신은 코드 리뷰 면접관입니다. 지원자가 제출한 코드와 과정 기록을 읽고, 지원자가 구조를 이해했는지 확인하는 '설명 질문' 2개를 만듭니다.",
    "좋은 설명 질문은 지원자가 정의서에서 스스로 정한 결정(겹침 규칙, 동시 수정, 시간대 등)과 그 결정이 구현된 코드 위치를 짚고, '왜 그렇게 했는지'를 묻습니다.",
    "AI 도우미가 준 코드를 그대로 붙인 흔적이 있으면 그 부분의 동작을 설명하게 하는 질문을 포함합니다.",
    "질문은 한국어 1~2문장, 구체적이어야 합니다. 각 질문에 근거 id를 1개 이상 답니다.",
    REF_RULES,
    "출력은 JSON { questions: [{ question, evidence: [...] }, { question, evidence: [...] }] } 입니다.",
  ].join("\n");
  const user = [
    `과제: ${task.title}`,
    "",
    "지원자의 해결책 정의서 [spec]:",
    s.clarify.spec.text || "(비어 있음)",
    "",
    "실무진 Q&A:",
    renderQa(s),
    "",
    "AI 도우미 대화:",
    renderChat(s),
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
    "답변이 '코드의 어느 부분이 어떻게 동작하는지' 또는 '왜 그렇게 정했는지'를 말하지 못하고 일반론에 머물면 ambiguous=true 로 보고, 그 빈 곳을 콕 집는 꼬리질문 1개를 한국어 한 문장으로 만듭니다.",
    "답변이 구체적이면 ambiguous=false 이고 followUp은 비웁니다.",
    "출력은 JSON { ambiguous: boolean, followUp?: string } 입니다.",
  ].join("\n");
  const user = [
    `질문 (${item.kind === "explain" ? "설명 질문" : "확장 설계 질문"}): ${item.question}`,
    `지원자 답변: ${item.answer ?? ""}`,
    "",
    "참고용 제출 코드:",
    renderCode(s),
  ].join("\n");
  return { system, user };
}

const COMPETENCY_DEFS = [
  "requirements (요구사항 확정력): 질문이 모호한 지점을 겨냥했는가, 정의서에 결정과 이유가 있는가.",
  "implementation (구현 품질): 체크리스트 통과, 코드 구조.",
  "ai_usage (AI 활용): 도우미에게 무엇을 맡기고 무엇을 검증했는가, 답을 그대로 붙였는가.",
  "understanding (구조 이해): 설명 질문 답변이 코드와 일치하고 이유를 말하는가.",
  "extension (확장 설계): 확장 질문 답변이 현재 구조의 어느 부분을 바꾸는지 짚는가.",
];

export function reportPrompt(s: Session, task: Task): { system: string; user: string } {
  const system = [
    "당신은 채용 평가 리포트를 쓰는 시니어 프론트엔드 면접관입니다. 아래 기록만 근거로 역량 5개를 1~5점으로 매기고, 각 점수의 근거 id를 답니다.",
    "점수 기준: 1 근거 없음 또는 반대 근거, 2 미흡, 3 보통, 4 좋음, 5 매우 좋음.",
    "역량 정의:",
    ...COMPETENCY_DEFS.map((d) => `- ${d}`),
    "",
    "리포트의 목적은 'AI로 구현만 한 사람'과 '구조를 이해한 사람'을 구분하는 것입니다. 설명 질문 답변이 코드와 어긋나거나 일반론이면 understanding 점수를 낮게 줍니다.",
    "rationale은 한국어 2~3문장이며, 문장 안에 근거 id를 대괄호로 인용합니다. 예: \"겹침 규칙을 등록일 기준으로 정했고[spec] 질문도 그 지점을 겨냥했다[qa-2].\"",
    "checklist는 주어진 항목 5개를 순서대로 코드로 점검해 passed와 근거를 적습니다.",
    "interviewQuestions는 면접관이 실제 면접에서 물을 후속 질문 3개입니다.",
    REF_RULES,
    "출력은 JSON { competencies: [...5개], checklist: [...], interviewQuestions: [...] } 입니다.",
  ].join("\n");
  const review = s.review.items
    .map((d) => {
      const lines = [`[${d.id}] (${d.kind === "explain" ? "설명" : "확장 설계"}) Q: ${d.question}`, `      A: ${d.answer ?? "(무응답)"}`];
      if (d.followUp) lines.push(`      꼬리질문: ${d.followUp.question}`, `      A: ${d.followUp.answer ?? "(무응답)"}`);
      return lines.join("\n");
    })
    .join("\n");
  const user = [
    `과제: ${task.title}`,
    `요구사항 원문: ${task.requirementMessage}`,
    "",
    "체크리스트:",
    ...task.checklist.map((c, i) => `${i + 1}. ${c}`),
    "",
    `실무진 Q&A (${s.clarify.qa.length}/${s.clarify.questionLimit}회 사용):`,
    renderQa(s),
    "",
    "해결책 정의서 [spec]:",
    s.clarify.spec.text || "(비어 있음)",
    "",
    "AI 도우미 대화:",
    renderChat(s),
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
