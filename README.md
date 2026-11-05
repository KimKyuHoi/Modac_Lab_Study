# AI 활용 과제 평가 MVP

모호한 요구사항을 주고, AI 실무진에게 5번만 물어가며 AI 코딩 도우미와 함께 구현하게 한 뒤, 제출 직후 그 사람의 기록(실무진 Q&A, 도우미 대화)과 코드를 읽고 사람마다 다른 질문을 만들어 묻고, 근거가 달린 리포트를 만드는 로컬 데모입니다.

가설: 사후 설계 질의로 "AI로 구현만 한 사람"과 "구조를 이해한 사람"을 리포트만으로 구분할 수 있다.

설계 문서: `docs/superpowers/specs/2026-11-03-ai-assessment-mvp-design.md`

## 실행

```bash
npm install
cp .env.example .env.local   # VITE_GEMINI_API_KEY에 Google AI Studio 키를 넣는다
npm run dev                  # http://localhost:5173
```

키는 브라우저에서 그대로 쓰입니다. 로컬 데모 전용이며 배포하지 마세요. 모델은 역할별로 `VITE_GEMINI_MODEL_STAKEHOLDER`(AI 실무진), `VITE_GEMINI_MODEL_ASSISTANT`(코딩 도우미), `VITE_GEMINI_MODEL_JUDGE`(설계 질의·채점)로 정합니다. 비어 있으면 `VITE_GEMINI_MODEL`, 그다음 `gemini-3.6-flash`를 씁니다. 자세한 설명은 `.env.example`을 보세요.

## 흐름

1. `/` 이름을 넣고 시작
2. `/work` 프로그래머스식 한 화면. 왼쪽에 마케팅 담당자의 애매한 메시지와 AI 실무진 채팅(5회), 가운데 Sandpack 에디터, 오른쪽 AI 코딩 도우미(대화 기록). 패널 폭은 드래그로 조절
3. `/review` AI가 기록과 코드를 읽고 만든 질문 3개: AI에게 시킨 것의 이유, 설계 결정의 이유, 확장. 답이 모호하면 꼬리질문 1회
4. `/report/:id` 역량 5개 점수 초안과 근거 각주, 이 지원자가 고민한 지점(highlights). 면접관이 점수 확정
5. `/sessions` 저장된 세션 목록

타이머는 경고만 하고 강제 종료하지 않습니다.

## 기록 저장

- 상태가 바뀔 때마다 브라우저 localStorage에 저장됩니다. 새로고침해도 이어집니다.
- 단계 전환, 제출, 리포트 생성, 점수 확정 시 `data/sessions/<id>.json`에 파일로 저장됩니다. 개발 서버의 미들웨어가 씁니다(`vite-plugins/sessions.ts`).
- `data/sessions/sample-*.json`은 손으로 만든 예시 세션입니다. 리포트 형식을 볼 때 쓰세요.

## 모의 응시로 가설 확인하기

1. 동료 몇 명을 두 그룹으로 나눕니다. A 그룹은 도우미 답을 거의 그대로 붙여 넣고, B 그룹은 평소처럼 풉니다.
2. 각자 `/`에서 이름을 넣고 끝까지 완주합니다.
3. `/sessions`에서 리포트를 열어, 이름을 가리고 "구조 이해"와 "요구사항 확정력" 점수와 근거만으로 두 그룹을 맞혀 봅니다.
4. 맞힌 비율과 틀린 사례의 근거를 기록합니다. 인원이 적으니 증명이 아니라 신호입니다.

## 테스트

```bash
npm test          # vitest
npm run typecheck
npm run build
```

Gemini 호출은 테스트에서 mock입니다. UI는 전체 루프 1회 완주, 새로고침 복구, API 실패 시 재시도를 손으로 확인합니다.

## 범위 밖

- 채용담당자의 과제 생성·검수 화면 (과제는 `src/task/videoSearch.ts`에 손으로 작성하고, 내는 과제는 `src/task/index.ts`의 `currentTask`로 고른다)
- 히든 테스트 자동 실행 (대신 리포트 생성 시 체크리스트 5개를 모델이 점검)
- 로그인, 배포, 부정행위 방지
