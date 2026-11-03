# AI 활용 과제 평가 MVP 설계

작성일: 2026-11-03
근거 문서: 모닥랩 2주차 기획서(김규회), 1주차 리서치

## 1. 목적과 가설

- 가설: 모호한 요구사항을 스스로 확정하게 하고, 제출 직후 설계 질의를 하면 "AI로 구현만 한 사람"과 "구조를 이해한 사람"을 리포트만으로 구분할 수 있다.
- 검증 방법: 동료 몇 명이 모의 응시한다. 절반은 AI 답을 거의 그대로 쓰고, 절반은 평소처럼 푼다. 리포트만 보고 두 그룹을 구분할 수 있는지 본다.
- 기획서 대비 추가된 장치: 요구사항을 일부러 모호하게 주고, AI 실무진(PM 역할)에게 질문 5회만 허용한다. 지원자는 해결책 정의서를 써서 요구사항을 확정한 뒤 구현한다.

## 2. 범위

포함:
1. 세션 시작 (이름 입력)
2. 과제 브리핑 + AI 실무진 Q&A (5회) + 해결책 정의서 작성·확정
3. Sandpack 구현 환경 + AI 코딩 도우미 채팅 (대화 기록)
4. 제출 직후 설계 질의: 설명 질문 2개 + 확장 설계 질문 1개 + 꼬리질문(모호할 때 질문당 최대 1회), 15분 타이머
5. 근거 링크 달린 리포트 + 면접관 점수 확정·메모
6. 세션 목록 (그룹 비교용)
7. 세션 기록을 `data/sessions/<id>.json`에 저장

제외:
- 채용담당자의 과제 생성·검수 화면 (과제 1개는 손으로 제작)
- 히든 테스트 자동 실행 (대신 리포트 생성 시 고정 체크리스트 5개를 Gemini가 점검)
- 로그인, 배포, 부정행위 방지, 다중 과제

## 3. 기술 스택

- Vite + React 18 + TypeScript
- Ant Design 5 (ConfigProvider 테마 토큰으로 커스터마이즈)
- react-router-dom 6
- @codesandbox/sandpack-react (react 템플릿, 커스텀 파일)
- @google/genai (브라우저에서 직접 호출, 키는 `.env.local`의 `VITE_GEMINI_API_KEY`, 모델은 `VITE_GEMINI_MODEL`, 기본 `gemini-2.5-flash`)
- Vitest + @testing-library/react
- 세션 파일 저장: `vite.config.ts`의 커스텀 플러그인이 개발 서버에 `POST /__sessions/:id` 미들웨어를 붙여 `data/sessions/<id>.json`에 쓴다. `GET /__sessions`로 목록을 읽는다. 별도 서버 프로세스 없음.

주의: API 키가 브라우저에 노출되므로 로컬 데모 전용이다. 배포하지 않는다.

## 4. 화면과 흐름

라우트는 세션 단계(phase)에 묶인다. 단계가 안 맞는 라우트로 들어오면 현재 단계로 보낸다.

| 라우트 | phase | 내용 |
|---|---|---|
| `/` | - | 이름 입력, 진행 안내(단계 5개와 소요 시간), "응시 시작" |
| `/task` | `clarify` | 좌: 과제 설명(모호한 요구사항 원문). 우: AI 실무진 채팅, 남은 질문 5회 표시. 하단: 해결책 정의서 편집기. "정의 확정"으로 잠그고 `build`로 |
| `/build` | `build` | 좌: Sandpack 에디터 + 미리보기. 우: 탭 2개 (AI 코딩 도우미 / 확정된 정의서·과제). 상단: 경과 시간. "제출"로 `review`로 |
| `/review` | `review` | 질문을 하나씩 순서대로. 설명 질문 2개 → 확장 설계 질문 1개. 각 답변 후 꼬리질문 판단. 남은 시간 15분 표시(경고만). 마지막 답변 후 리포트 생성 → `done` |
| `/report/:id` | `done` | 역량별 점수 초안과 근거 각주. 면접관 확정 점수·메모 입력. JSON 다운로드 |
| `/sessions` | - | 저장된 세션 표: 이름, 시작 시각, 질문 사용 수, 점수 초안, 확정 점수 |

타이머는 모두 경고만 한다. 강제 종료는 없다.

## 5. 과제 (손으로 제작, 1개)

제목: 기존 배너 관리 앱에 국가별 예약 노출 기능 추가하기

시작 코드: 배너 목록과 등록 폼이 있는 작은 React 앱. 배너는 `{ id, title, imageUrl, createdAt }`. 홈 화면 상단 한 자리에 배너 하나를 보여 준다.

지원자에게 주는 요구사항 원문 (일부러 모호함):
> 마케팅팀이 국가별로 배너를 미리 예약해 두고 싶어 합니다. 정해진 기간에 해당 국가 사용자에게만 보이면 됩니다. 운영자가 관리 화면에서 예약을 등록·수정할 수 있어야 합니다.

AI 실무진의 숨겨진 사실표 (물어보면 답하고, 안 물어보면 말하지 않음):
- 국가는 KR, JP, US로 시작하고 나중에 늘어난다.
- 예약은 시작·종료 일시를 지정한다.
- 한 자리에는 한 배너만 보여야 한다. 겹칠 때 무엇을 우선할지는 정하지 않았다. 개발자에게 제안을 요청한다.
- 시간대는 국가 현지 시간 기준이다.
- 운영자 두 명이 같은 배너를 동시에 고치는 일이 가끔 있다. 어떻게 할지는 정하지 않았다.
- 국가가 안 맞거나 기간 밖이면 기본 배너(국가 없음, 기간 없음)를 보여 준다.

실무진 페르소나 규칙:
- 마케팅팀과 일하는 PM. 기술 결정은 하지 않는다. "그건 개발자가 정해 주시면 좋겠어요, 이유도 같이요"로 넘긴다.
- 한 번에 하나만 답한다. 묻지 않은 사실은 덧붙이지 않는다.
- 사실표에 없는 것은 "모르겠어요, 확인해 볼게요"로 답하고 지어내지 않는다.
- 답은 3문장 이내.

확장 설계 시나리오 (미리 정의): "같은 자리에서 국가별로 배너 두 개를 A/B 테스트해야 한다면 지금 구조에서 무엇을 바꾸겠어요?"

고정 체크리스트 (리포트 생성 시 코드 점검):
1. 국가별 필터링이 동작한다.
2. 기간 안에서만 노출된다.
3. 겹치는 예약을 처리하는 규칙이 코드에 있고 정의서와 일치한다.
4. 관리 화면에서 예약을 등록·수정할 수 있다.
5. 기본 배너 폴백이 있다.

## 6. 데이터 모델

세션 하나가 JSON 한 파일이다. 모든 기록 항목에 id가 붙고, 리포트는 이 id만 근거로 쓴다.

```ts
type Session = {
  id: string;                 // ulid
  candidateName: string;
  taskId: "banner-schedule";
  phase: "clarify" | "build" | "review" | "done";
  startedAt: string;          // ISO
  clarify: {
    qa: { id: `qa-${number}`; question: string; answer: string; at: string }[];
    questionLimit: 5;
    spec: { text: string; lockedAt?: string };   // id "spec"
  };
  build: {
    startedAt?: string;
    chat: { id: `chat-${number}`; role: "user" | "model"; text: string; at: string }[];
    snapshots: { at: string; lines: Record<string, number> }[];  // 2분마다 파일별 줄 수
    files: Record<string, string>;                 // 제출 시 최종 파일
    submittedAt?: string;
  };
  review: {
    startedAt?: string;
    items: {
      id: `dq-${number}`;
      kind: "explain" | "extend";
      question: string;
      evidence: EvidenceRef[];       // 질문의 근거
      answer?: string;
      followUp?: { question: string; answer?: string };
      answeredAt?: string;
    }[];
  };
  report?: {
    generatedAt: string;
    competencies: {
      key: "requirements" | "implementation" | "ai_usage" | "understanding" | "extension";
      draftScore: 1 | 2 | 3 | 4 | 5;
      rationale: string;
      evidence: EvidenceRef[];
    }[];
    checklist: { item: string; passed: boolean; evidence: EvidenceRef[] }[];
    interviewQuestions: string[];
    interviewer?: { finalScores: Record<string, number>; notes: string; confirmedAt: string };
  };
};

// "qa-3" | "chat-12" | "spec" | "dq-1" | "code:src/App.jsx:40-52"
type EvidenceRef = string;
```

저장:
- 모든 상태 변경 시 localStorage(`session:<id>`, `session:current`)에 즉시 저장.
- 단계 전환, 제출, 리포트 생성, 면접관 확정 시 `POST /__sessions/:id`로 파일 저장.
- 리포트 화면에 JSON 다운로드 버튼.

## 7. Gemini 호출

모듈 `src/ai/gemini.ts`가 클라이언트 하나를 만들고, 용도별 함수가 프롬프트를 조립한다. 프롬프트 빌더는 순수 함수로 분리해 테스트한다. 구조화 출력은 `responseMimeType: "application/json"` + `responseSchema`를 쓰고, 응답은 zod로 검증한다.

| 함수 | 입력 | 출력 | 비고 |
|---|---|---|---|
| `askStakeholder` | 사실표, 페르소나, qa 이력, 새 질문 | 텍스트 | 성공 시에만 횟수 차감 |
| `askCodingAssistant` | 현재 files, chat 이력, 새 메시지 | 텍스트 | 파일은 합쳐서 전달, 총 40KB 초과 시 큰 파일부터 잘라냄 |
| `generateDesignQuestions` | spec, files, qa, chat | `{ questions: [{question, evidence[]}, {question, evidence[]}] }` | 설명 질문 2개. 정의서에서 지원자가 스스로 정한 결정(겹침·동시수정 등)과 그 구현부를 짚도록 지시. 확장 질문은 고정 시나리오를 그대로 붙임 |
| `judgeFollowUp` | 질문, 답변, 관련 코드 | `{ ambiguous: boolean; followUp?: string }` | 모호할 때만 꼬리질문 1회 |
| `generateReport` | 세션 전체 | report JSON | 역량 5개, 체크리스트 5개, 면접 질문 3개. 모든 점수에 evidence 1개 이상 필수. evidence가 실제 존재하는 id인지 클라이언트에서 검증하고 없으면 제거 |

역량 정의 (프롬프트에 그대로 넣음):
- requirements 요구사항 확정력: 질문이 모호한 지점을 겨냥했는가, 정의서에 결정과 이유가 있는가
- implementation 구현 품질: 체크리스트 통과, 코드 구조
- ai_usage AI 활용: 도우미에게 무엇을 맡기고 무엇을 검증했는가, 답을 그대로 붙였는가
- understanding 구조 이해: 설명 질문 답변이 코드와 일치하고 이유를 말하는가
- extension 확장 설계: 확장 질문 답변이 현재 구조의 어느 부분을 바꾸는지 짚는가

에러 처리: 호출 실패 시 antd `message.error`와 재시도 버튼. 재시도해도 실패하면 단계는 그대로 두고 세션은 저장된 상태를 유지한다. JSON 검증 실패는 1회 자동 재호출 후 실패 처리.

## 8. 프로젝트 구조

```
src/
  main.tsx, App.tsx            라우터, ConfigProvider 테마
  theme.ts                     디자인 토큰
  task/bannerSchedule.ts       과제 원문, 시작 코드 files, 사실표, 페르소나, 시나리오, 체크리스트
  session/
    types.ts, reducer.ts       Session 타입과 리듀서(순수)
    store.tsx                  Context + localStorage + 파일 저장
    evidence.ts                EvidenceRef 파싱·해석(id → 원문)
  ai/
    gemini.ts                  클라이언트, 호출 래퍼
    prompts.ts                 프롬프트 빌더(순수)
    schemas.ts                 zod 스키마
  pages/
    Start, Task, Build, Review, Report, Sessions
  components/
    ChatPanel, QuestionBudget, SpecEditor, EvidenceChip, EvidenceDrawer, PhaseTimer, ScoreRow
vite.config.ts                 sessionsPlugin (파일 저장 미들웨어)
data/sessions/                 세션 JSON (gitignore 제외, 샘플 1개는 커밋)
```

## 9. 테스트

- Vitest 단위: `reducer.ts` (질문 차감, 정의서 잠금, 단계 전환), `evidence.ts` (ref 파싱, 존재 검증, 코드 범위 추출), `prompts.ts` (사실표·이력이 포함되는지, 파일 자르기), `schemas.ts` (잘못된 응답 거부).
- Gemini는 모듈 mock.
- UI는 수동 E2E: 전체 루프 1회 완주, 새로고침 후 복구, API 실패 시 재시도.

## 10. 비주얼 디자인 플랜

대상: 응시 중인 지원자와 리포트를 읽는 면접관. 지원자 화면의 일은 "집중을 방해하지 않기", 리포트의 일은 "모든 점수에 근거가 보이기".

색 (기획서의 핑크·잉크 조합을 그대로 가져온다):
- 잉크 `#16202B` 본문 글자, 진한 면
- 종이 `#FFFFFF` 기본 배경
- 서리 `#F2F4F7` 보조 패널 배경
- 먹선 `#D9DEE5` 1px 구분선
- 핑크 `#F23D97` 유일한 강조색. "결정을 요구하는 순간"에만 쓴다: 남은 질문 점, 설계 질문 카드의 왼쪽 띠, 근거 각주
- 이끼 `#2F7D5B` 확정·통과 상태

타입: Pretendard 한 가족만. 제목 700, 본문 400, 숫자는 tabular. 코드는 Sandpack 기본 모노스페이스. 본문 줄 길이 70자 이내, 줄 간격 1.65.

레이아웃: 응시 화면은 작업대 구조다. 왼쪽 넓은 면에 할 일(과제, 에디터), 오른쪽 좁은 레일에 AI 대화. 카드 남발 대신 여백과 1px 먹선으로 나눈다. AntD 기본 radius 6 → 4, 그림자 없음.

```
/task                                   /report
+---------------------+--------------+  +--------------------------------+
| 과제 설명            | AI 실무진     |  | 이름 · 시작 시각 · 질문 3/5 사용   |
|                     | ●●●○○ 남음 3 |  |--------------------------------|
|                     | 대화…        |  | 요구사항 확정력   4  ████░      |
|                     |              |  |   정의서에서 겹침 규칙을 "등록일   |
|---------------------+--------------|  |   늦은 쪽"으로 정함[spec] 질문 2  |
| 해결책 정의서                        |  |   가 겹침을 겨냥[qa-2]           |
| (편집기)              [정의 확정]    |  | 구현 품질        3  ███░░      |
+------------------------------------+  |   …[code:src/Banner.jsx:12-30] |
                                        +--------------------------------+
```

기억에 남을 요소 하나: **남은 질문을 숫자가 아니라 핑크 점 5개로 보여 주고, 쓸 때마다 하나씩 비운다.** 리포트에서는 **모든 문장이 각주형 인용을 단다**. 근거 칩은 `[qa-2]`처럼 본문 안에 인라인으로 들어가고 누르면 오른쪽 Drawer에 원문이 열린다.

원칙:
1. 핑크는 지원자가 결정해야 하는 순간과 근거에만. 버튼 기본색은 잉크.
2. 숫자 카운터 대신 점. 진행률 바 대신 단계 이름.
3. 설명 라벨을 위에 얹지 않는다. 제목이 곧 설명이다.
4. 자동 모션 없음. 질문 점이 비는 순간만 150ms 전환.
5. 빈 화면은 다음 행동을 말한다. "아직 질문하지 않았어요. 모호한 부분부터 물어보세요."

일반 기본값과의 차이 점검: AntD 기본 파랑·radius 6·그림자 카드를 버렸다. 핑크·잉크는 이 프로젝트의 기획서에서 왔다. 넘버링은 시작 화면의 단계 안내(실제 순서)에만 쓴다. 대문자 눈썹 라벨, 중점 구분, 화살표 버튼 텍스트는 쓰지 않는다.
