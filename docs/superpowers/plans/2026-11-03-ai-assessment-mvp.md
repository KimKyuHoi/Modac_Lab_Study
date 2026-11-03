# AI 활용 과제 평가 MVP 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모호한 요구사항 → AI 실무진 Q&A(5회) → 정의서 → Sandpack 구현 → 설계 질의 → 근거 각주 리포트까지 한 지원자가 완주할 수 있는 로컬 데모 앱.

**Architecture:** Vite + React 단일 앱. 세션 하나가 JSON 하나이며 순수 리듀서로만 바뀐다. Gemini는 브라우저에서 직접 호출하고, 프롬프트 빌더와 응답 스키마는 순수 모듈로 분리해 테스트한다. Vite 개발 서버 플러그인이 세션 JSON을 `data/sessions/`에 쓴다.

**Tech Stack:** vite 7, react 19, typescript 5.9, antd 5.29, react-router-dom 6.30, @codesandbox/sandpack-react 2.20, @google/genai 2.32 (`<3`), zod 3, ulid 3, vitest 3 + jsdom 26 + @testing-library/react 16.

**Spec:** `docs/superpowers/specs/2026-11-03-ai-assessment-mvp-design.md`

## Global Constraints

- API 키는 `VITE_GEMINI_API_KEY`, 모델은 `VITE_GEMINI_MODEL` (기본 `gemini-flash-latest`). 키 없으면 앱 상단에 안내 Alert, 호출 시 명확한 에러.
- 질문 한도 5회. 성공한 호출만 차감.
- 설계 질의: explain 2개 + extend 1개, 꼬리질문은 항목당 최대 1회. 타이머 15분, 경고만.
- 모든 리포트 점수는 실제 존재하는 EvidenceRef를 1개 이상 가진다. 없는 ref는 클라이언트에서 제거하고, evidence가 비면 그 역량은 "근거 부족"으로 표시한다.
- 타이머는 강제 종료하지 않는다.
- 디자인 토큰: 잉크 `#16202B`, 종이 `#FFFFFF`, 서리 `#F2F4F7`, 먹선 `#D9DEE5`, 핑크 `#F23D97`, 이끼 `#2F7D5B`. 폰트 Pretendard. radius 4, 그림자 없음. 핑크는 남은 질문 점, 설계 질문 띠, 근거 각주에만.
- 카피: 능동태, 버튼은 일어날 일을 그대로 ("정의 확정", "제출", "점수 확정"). 라벨은 대문자·중점·화살표 없음.
- 파일 저장 경로 `data/sessions/<id>.json`. `.gitignore`에 `data/sessions/*` 추가, `!data/sessions/sample-*.json`은 커밋.

## Review Focus

1. Gemini 호출 실패(네트워크·429) 시 질문 횟수가 차감되지 않고 재시도가 가능해야 한다. → Task 3 리듀서 테스트 `does not decrement on failure`, Task 7 UI 수동 확인.
2. 새로고침 후 같은 단계·같은 데이터로 복구되어야 한다. → Task 4 store 테스트 `restores current session from localStorage`.
3. Gemini가 존재하지 않는 evidence id를 지어낼 수 있다. → Task 3 `evidence.ts` 테스트 `filterExisting drops unknown refs`, Task 9에서 리포트 저장 전에 적용.
4. Sandpack 파일이 40KB를 넘으면 코딩 도우미 프롬프트가 잘려야 한다. → Task 5 `truncateFiles keeps total under budget`.
5. 설계 질문 생성 응답이 JSON 스키마에 안 맞으면 1회 재호출 후 에러를 사용자에게 보여야 한다. → Task 5 `callJson retries once on invalid JSON`.

---

### Task 1: 프로젝트 골격과 테마

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.env.example`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/theme.ts`, `src/pages/{Start,Task,Build,Review,Report,Sessions}.tsx` (placeholder), `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `theme.ts`의 `tokens` 객체와 `antdTheme: ThemeConfig`. 라우트 `/`, `/task`, `/build`, `/review`, `/report/:id`, `/sessions`.

- [ ] Step 1: `npm create vite@latest . -- --template react-ts` 후 의존성 설치 (버전은 Tech Stack 그대로 핀).
- [ ] Step 2: `vite.config.ts`에 vitest 설정 (`environment: "jsdom"`, `setupFiles: ["src/test/setup.ts"]`, `globals: true`).
- [ ] Step 3: `src/App.test.tsx` 작성: `renders start page heading` — `/`에서 "응시 시작" 버튼이 보인다.
- [ ] Step 4: 실패 확인 `npx vitest run`.
- [ ] Step 5: `theme.ts`, `App.tsx`(ConfigProvider + BrowserRouter + Routes), placeholder 페이지 구현. `index.html`에 Pretendard CDN link.
- [ ] Step 6: 테스트 통과, `npm run build` 성공 확인.
- [ ] Step 7: Commit `chore: scaffold vite app with antd theme and routes`.

### Task 2: 과제 콘텐츠

**Files:**
- Create: `src/task/bannerSchedule.ts`, `src/task/starterFiles.ts`
- Test: `src/task/bannerSchedule.test.ts`

**Interfaces:**
- Produces:
```ts
export type Task = {
  id: "banner-schedule"; title: string;
  requirementMessage: string;       // 마케팅 담당자 메시지 원문
  facts: string[];                  // 숨겨진 사실표 (스펙 5절 그대로)
  personaRules: string[];           // 페르소나 규칙
  extensionScenario: string;
  checklist: string[];              // 5개
  starterFiles: Record<string, string>;   // Sandpack files, 키는 "/src/App.jsx" 형식
  timeBudgetMin: { build: 60; review: 15 };
};
export const bannerScheduleTask: Task;
```
- starterFiles: `/src/App.jsx`(Home/Admin 탭), `/src/Home.jsx`(상단 배너 1개), `/src/Admin.jsx`(배너 목록+등록 폼), `/src/api/banners.js`(메모리 배열, 300ms 지연, `listBanners/createBanner/updateBanner`), `/src/user.js`(`getUserCountry()` 는 "KR" 반환), `/src/styles.css`.

- [ ] Step 1: 테스트: `checklist has 5 items`, `starterFiles contains /src/App.jsx and /src/api/banners.js`, `facts mention 120만 and KR, JP, US`.
- [ ] Step 2: 실패 확인.
- [ ] Step 3: 구현. 스펙 5절의 문장을 그대로 옮긴다.
- [ ] Step 4: 통과 확인, Commit `feat: add banner schedule task content`.

### Task 3: 세션 타입·리듀서·근거 해석

**Files:**
- Create: `src/session/types.ts`, `src/session/reducer.ts`, `src/session/evidence.ts`
- Test: `src/session/reducer.test.ts`, `src/session/evidence.test.ts`

**Interfaces:**
- Produces: 스펙 6절의 `Session`, `EvidenceRef` 타입 그대로.
```ts
export function createSession(candidateName: string, now?: string): Session;
export type Action =
  | { type: "qa/add"; question: string; answer: string; at: string }
  | { type: "spec/edit"; text: string }
  | { type: "spec/lock"; at: string }                 // phase → build, build.startedAt
  | { type: "chat/add"; role: "user" | "model"; text: string; at: string }
  | { type: "snapshot/add"; at: string; lines: Record<string, number> }
  | { type: "files/set"; files: Record<string, string> }
  | { type: "build/submit"; at: string }              // phase → review, review.startedAt
  | { type: "review/setItems"; items: ReviewItem[] }
  | { type: "review/answer"; id: string; answer: string; at: string }
  | { type: "review/followUp"; id: string; question: string }
  | { type: "review/answerFollowUp"; id: string; answer: string }
  | { type: "report/set"; report: Report }            // phase → done
  | { type: "report/confirm"; finalScores: Record<string, number>; notes: string; at: string };
export function reduce(s: Session, a: Action): Session;
export function remainingQuestions(s: Session): number;

// evidence.ts
export type ResolvedEvidence =
  | { kind: "qa"; id: string; question: string; answer: string }
  | { kind: "chat"; id: string; role: string; text: string }
  | { kind: "spec"; id: "spec"; text: string }
  | { kind: "dq"; id: string; question: string; answer?: string }
  | { kind: "code"; id: string; path: string; from: number; to: number; snippet: string };
export function parseRef(ref: string): { kind: "qa"|"chat"|"spec"|"dq"|"code"; id: string; path?: string; from?: number; to?: number } | null;
export function resolveRef(s: Session, ref: string): ResolvedEvidence | null;
export function filterExisting(s: Session, refs: string[]): string[];
export function listRefIds(s: Session): string[];   // 프롬프트에 "쓸 수 있는 id 목록"으로 전달
```

- [ ] Step 1: reducer 테스트: `qa/add assigns qa-1, qa-2`, `qa/add beyond 5 is ignored`, `remainingQuestions counts down`, `spec/lock moves phase to build`, `build/submit moves to review`, `report/set moves to done`, `does not decrement on failure`(실패 시 액션을 디스패치하지 않는 설계이므로 "qa/add 없이 remainingQuestions 유지" 로 표현).
- [ ] Step 2: evidence 테스트: `parseRef("code:src/App.jsx:40-52")`, `parseRef("qa-3")`, `resolveRef returns snippet lines 40-52`, `filterExisting drops unknown refs`, `listRefIds includes spec, qa-*, chat-*, dq-*`.
- [ ] Step 3: 실패 확인 → 구현 → 통과.
- [ ] Step 4: Commit `feat: session reducer and evidence resolver`.

### Task 4: 세션 스토어와 파일 저장 플러그인

**Files:**
- Create: `src/session/store.tsx`, `src/session/persist.ts`, `vite-plugins/sessions.ts`
- Modify: `vite.config.ts`
- Test: `src/session/persist.test.ts`, `vite-plugins/sessions.test.ts`

**Interfaces:**
```ts
// persist.ts
export function saveLocal(s: Session): void;            // "session:<id>" + "session:current"
export function loadCurrent(): Session | null;
export function loadLocal(id: string): Session | null;
export function saveFile(s: Session): Promise<void>;    // POST /__sessions/:id
export function listFiles(): Promise<Session[]>;        // GET /__sessions
// store.tsx
export function SessionProvider({children}): JSX.Element;
export function useSession(): { session: Session | null; dispatch(a: Action): void; start(name: string): Session; persistFile(): Promise<void> };
// vite-plugins/sessions.ts
export function sessionsPlugin(dir?: string): Plugin;   // 기본 "data/sessions"
```
- `dispatch`는 매번 `saveLocal`. `persistFile`은 단계 전환·제출·리포트·확정 시 페이지가 명시적으로 호출.
- 플러그인: `configureServer`에서 `POST /__sessions/:id` 본문을 `<dir>/<id>.json`에 쓰고 201, `GET /__sessions`는 디렉토리의 json 배열. id는 `/^[0-9A-Z]{26}$/` 만 허용.

- [ ] Step 1: persist 테스트 (jsdom localStorage): `restores current session from localStorage`.
- [ ] Step 2: 플러그인 테스트: 임시 디렉토리에 미들웨어를 직접 호출해 파일이 생기는지, 잘못된 id는 400.
- [ ] Step 3: 구현, 통과. `.gitignore`와 `data/sessions/.gitkeep`.
- [ ] Step 4: Commit `feat: session store with localStorage and file persistence`.

### Task 5: Gemini 레이어

**Files:**
- Create: `src/ai/gemini.ts`, `src/ai/prompts.ts`, `src/ai/schemas.ts`, `src/ai/index.ts`
- Test: `src/ai/prompts.test.ts`, `src/ai/schemas.test.ts`, `src/ai/gemini.test.ts`

**Interfaces:**
```ts
// gemini.ts
export type Turn = { role: "user" | "model"; text: string };
export function isConfigured(): boolean;
export function callText(system: string, turns: Turn[]): Promise<string>;
export function callJson<T>(system: string, turns: Turn[], jsonSchema: object, parse: (raw: unknown) => T): Promise<T>; // zod 실패 시 1회 재호출
// prompts.ts (순수)
export function stakeholderSystem(task: Task): string;
export function assistantSystem(files: Record<string,string>): string;   // truncateFiles 적용
export function truncateFiles(files: Record<string,string>, budgetBytes?: number /*40_000*/): Record<string,string>;
export function designQuestionsPrompt(s: Session, task: Task): { system: string; user: string };
export function followUpPrompt(item: ReviewItem, s: Session): { system: string; user: string };
export function reportPrompt(s: Session, task: Task): { system: string; user: string };
// schemas.ts
export const designQuestionsSchema: z.ZodType<{ questions: { question: string; evidence: string[] }[] }>; // length 2
export const followUpSchema: z.ZodType<{ ambiguous: boolean; followUp?: string }>;
export const reportSchema: z.ZodType<Omit<Report,"generatedAt"|"interviewer">>;
export const designQuestionsJsonSchema, followUpJsonSchema, reportJsonSchema: object; // Gemini용
// index.ts
export function askStakeholder(task: Task, s: Session, question: string): Promise<string>;
export function askCodingAssistant(s: Session, message: string): Promise<string>;
export function generateDesignQuestions(task: Task, s: Session): Promise<ReviewItem[]>; // explain 2 + extend 1, evidence는 filterExisting 적용
export function judgeFollowUp(item: ReviewItem, s: Session): Promise<{ ambiguous: boolean; followUp?: string }>;
export function generateReport(task: Task, s: Session): Promise<Report>;
```
- 프롬프트 본문 규칙은 스펙 5절(페르소나)·7절(역량 정의)의 문장을 그대로 넣는다. `designQuestionsPrompt`와 `reportPrompt`에는 `listRefIds(s)`를 "사용 가능한 근거 id" 목록으로 넣고 "이 목록 밖의 id를 쓰지 말 것"을 명시한다.

- [ ] Step 1: prompts 테스트: `stakeholderSystem includes every fact and persona rule`, `truncateFiles keeps total under budget` (큰 파일부터 자름), `designQuestionsPrompt lists ref ids`.
- [ ] Step 2: schemas 테스트: `designQuestionsSchema rejects 1 question`, `reportSchema requires 5 competencies with evidence`.
- [ ] Step 3: gemini 테스트: `@google/genai` mock으로 `callJson retries once on invalid JSON`, `callText throws readable error when not configured`.
- [ ] Step 4: 구현, 통과. Commit `feat: gemini client, prompts and schemas`.

### Task 6: 시작·세션 목록 페이지

**Files:**
- Modify: `src/pages/Start.tsx`, `src/pages/Sessions.tsx`
- Create: `src/components/PhaseGuard.tsx`
- Test: `src/pages/Start.test.tsx`

**Interfaces:** `PhaseGuard({phase, children})`는 세션이 없거나 phase가 다르면 해당 단계 라우트로 `Navigate`. (`clarify→/task`, `build→/build`, `review→/review`, `done→/report/:id`)

- [ ] Step 1: 테스트 `start creates session and navigates to /task`.
- [ ] Step 2: Start: 이름 Input, 단계 5개 안내(번호 있음, 실제 순서), 키 미설정 Alert, "응시 시작". Sessions: `listFiles()` + localStorage 합집합을 Table로 (이름, 시작 시각, 질문 사용 수, 점수 초안 평균, 확정 여부, 리포트 열기).
- [ ] Step 3: 통과, Commit `feat: start and sessions pages`.

### Task 7: 과제 브리핑 + 실무진 Q&A + 정의서

**Files:**
- Modify: `src/pages/Task.tsx`
- Create: `src/components/ChatPanel.tsx`, `src/components/QuestionBudget.tsx`, `src/components/SpecEditor.tsx`
- Test: `src/components/QuestionBudget.test.tsx`

**Interfaces:**
```ts
ChatPanel({ turns: Turn[]; onSend(text): Promise<void>; disabled?: boolean; placeholder: string; emptyText: string; pending: boolean })
QuestionBudget({ total: 5; used: number })   // 핑크 점, 비면 먹선 테두리만. aria-label "남은 질문 3개"
SpecEditor({ value; onChange; locked: boolean })
```
- 레이아웃: 좌 7/12 과제 메시지 + 시작 코드 안내, 우 5/12 ChatPanel + QuestionBudget. 하단 SpecEditor + "정의 확정" (정의서 50자 미만이면 비활성). 확정 시 `spec/lock` → `persistFile` → `/build`.
- 질문 전송: `askStakeholder` 성공 시 `qa/add`, 실패 시 `message.error("실무진 답변을 받지 못했어요. 다시 보내 주세요.")` 와 입력 유지.
- emptyText: "아직 질문하지 않았어요. 모호한 부분부터 물어보세요."

- [ ] Step 1: 테스트 `renders 5 dots with used ones hollow`.
- [ ] Step 2: 구현, 통과. Commit `feat: task page with stakeholder chat and spec editor`.

### Task 8: 구현 페이지

**Files:**
- Modify: `src/pages/Build.tsx`
- Create: `src/components/PhaseTimer.tsx`, `src/components/SandpackWorkbench.tsx`
- Test: `src/components/PhaseTimer.test.tsx`

**Interfaces:**
```ts
PhaseTimer({ startedAt: string; budgetMin: number })   // 경과/남은 시간, 초과 시 핑크 글자 + "시간이 지났어요. 제출은 가능해요."
SandpackWorkbench({ files; onFilesChange(files): void })  // SandpackProvider template="react" + useSandpack로 파일 변경 구독
```
- 2분마다 `snapshot/add` (파일별 줄 수). 우측 Tabs: "AI 도우미"(ChatPanel, `askCodingAssistant`, 매 턴 `chat/add` 2건) / "확정한 정의서와 과제".
- "제출" → Modal 확인 → `files/set` + `build/submit` → `persistFile` → `/review`.

- [ ] Step 1: 테스트 `shows overtime message after budget`.
- [ ] Step 2: 구현, 통과. Commit `feat: build page with sandpack and coding assistant`.

### Task 9: 설계 질의 페이지

**Files:**
- Modify: `src/pages/Review.tsx`
- Create: `src/components/DesignQuestionCard.tsx`

- 진입 시 `review.items`가 비어 있으면 `generateDesignQuestions` 호출 → `review/setItems`. 로딩 중 "제출한 코드를 읽고 질문을 준비하고 있어요".
- 항목을 하나씩: 카드 왼쪽 핑크 띠, 질문, 종류 표기("설명 질문" / "확장 설계 질문"), TextArea, "답변 저장". 저장 후 `judgeFollowUp` → ambiguous면 꼬리질문 1회 표시. 마지막 답변 후 `generateReport` → `filterExisting` 적용 → `report/set` → `persistFile` → `/report/:id`.
- 실패 시 재시도 버튼, 상태 유지.

- [ ] Step 1: 구현. 수동 확인: 질문 3개, 꼬리질문 최대 1회, 타이머 15분.
- [ ] Step 2: Commit `feat: review page with design questions and follow-ups`.

### Task 10: 리포트 페이지

**Files:**
- Modify: `src/pages/Report.tsx`
- Create: `src/components/ScoreRow.tsx`, `src/components/EvidenceChip.tsx`, `src/components/EvidenceDrawer.tsx`, `src/components/EvidenceText.tsx`
- Test: `src/components/EvidenceText.test.tsx`

**Interfaces:**
```ts
EvidenceText({ text: string; session: Session; onOpen(ref): void })  // "[qa-2]" 패턴을 EvidenceChip으로 치환
EvidenceChip({ refId: string; onOpen(ref): void })                     // 핑크 각주 스타일
EvidenceDrawer({ session; refId: string | null; onClose })             // resolveRef 결과를 종류별로 렌더
ScoreRow({ label; draftScore; rationale; evidence; final?: number; onFinalChange })
```
- 상단: 이름, 시작 시각, 질문 사용 수, 체크리스트 통과 n/5. 본문: 역량 5개 ScoreRow (근거 없으면 "근거 부족"). 아래: 코드 체크리스트, 면접 추천 질문, 면접관 메모 TextArea, "점수 확정"(`report/confirm` + `persistFile`), "JSON 다운로드".
- `/report/:id`는 현재 세션이 아니면 `loadLocal(id)` 또는 `listFiles()`에서 찾는다.

- [ ] Step 1: 테스트 `EvidenceText renders chip for [qa-2] and plain text around it`.
- [ ] Step 2: 구현, 통과. Commit `feat: report page with evidence footnotes`.

### Task 11: 샘플 세션, README, 전체 점검

**Files:**
- Create: `data/sessions/sample-01ARZ3NDEKTSV4RRFFQ69G5FAV.json`, `README.md`

- [ ] Step 1: 완주 경로를 수동으로 1회 돌려 생성된 세션을 sample로 복사(키 없으면 fixture로 작성).
- [ ] Step 2: README: 설치, `.env.local` 설정, 실행, 모의 응시 절차(두 그룹), 세션 파일 위치, 범위 밖 항목.
- [ ] Step 3: `npx vitest run`, `npm run build`, `npx tsc --noEmit` 모두 통과 확인.
- [ ] Step 4: Commit `docs: README and sample session`.
