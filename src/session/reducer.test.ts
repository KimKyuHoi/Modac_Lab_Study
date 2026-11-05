import { createSession, reduce, remainingQuestions } from "./reducer";

const T = "2026-11-04T00:00:00.000Z";

test("createSession starts in clarify with 5 question limit", () => {
  const s = createSession("김규회", T);
  expect(s.phase).toBe("clarify");
  expect(s.clarify.questionLimit).toBe(5);
  expect(s.candidateName).toBe("김규회");
  expect(remainingQuestions(s)).toBe(5);
});

test("qa/add assigns qa-1, qa-2 and counts down", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "qa/add", question: "q1", answer: "a1", at: T });
  s = reduce(s, { type: "qa/add", question: "q2", answer: "a2", at: T });
  expect(s.clarify.qa.map((q) => q.id)).toEqual(["qa-1", "qa-2"]);
  expect(remainingQuestions(s)).toBe(3);
});

test("qa/add beyond 5 is ignored", () => {
  let s = createSession("a", T);
  for (let i = 0; i < 6; i++) s = reduce(s, { type: "qa/add", question: "q", answer: "a", at: T });
  expect(s.clarify.qa).toHaveLength(5);
  expect(remainingQuestions(s)).toBe(0);
});

test("remainingQuestions is unchanged when no qa/add is dispatched (failed call)", () => {
  const s = createSession("a", T);
  const same = reduce(s, { type: "spec/edit", text: "draft" });
  expect(remainingQuestions(same)).toBe(5);
});

test("spec/lock moves phase to build and stamps build.startedAt", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "spec/edit", text: "겹치면 등록일 늦은 쪽" });
  s = reduce(s, { type: "spec/lock", at: T });
  expect(s.phase).toBe("build");
  expect(s.clarify.spec.lockedAt).toBe(T);
  expect(s.build.startedAt).toBe(T);
});

test("spec/edit after lock is ignored", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "spec/edit", text: "v1" });
  s = reduce(s, { type: "spec/lock", at: T });
  s = reduce(s, { type: "spec/edit", text: "v2" });
  expect(s.clarify.spec.text).toBe("v1");
});

test("chat/add assigns chat-1, chat-2", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "chat/add", role: "user", text: "hi", at: T });
  s = reduce(s, { type: "chat/add", role: "model", text: "hello", at: T });
  expect(s.build.chat.map((c) => c.id)).toEqual(["chat-1", "chat-2"]);
});

test("build/submit moves to review and stamps times", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "spec/lock", at: T });
  s = reduce(s, { type: "files/set", files: { "/src/App.jsx": "x" } });
  s = reduce(s, { type: "build/submit", at: T });
  expect(s.phase).toBe("review");
  expect(s.build.submittedAt).toBe(T);
  expect(s.review.startedAt).toBe(T);
  expect(s.build.files["/src/App.jsx"]).toBe("x");
});

test("review/answer and followUp update the item", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "review/setItems", items: [{ id: "dq-1", kind: "design", question: "왜?", evidence: ["spec"] }] });
  s = reduce(s, { type: "review/answer", id: "dq-1", answer: "이유", at: T });
  s = reduce(s, { type: "review/followUp", id: "dq-1", question: "어디?" });
  s = reduce(s, { type: "review/answerFollowUp", id: "dq-1", answer: "여기" });
  const item = s.review.items[0];
  expect(item.answer).toBe("이유");
  expect(item.answeredAt).toBe(T);
  expect(item.followUp).toEqual({ question: "어디?", answer: "여기" });
});

test("report/set moves to done and report/confirm stores interviewer", () => {
  let s = createSession("a", T);
  s = reduce(s, {
    type: "report/set",
    report: { generatedAt: T, competencies: [], checklist: [], interviewQuestions: [], highlights: [] },
  });
  expect(s.phase).toBe("done");
  s = reduce(s, { type: "report/confirm", finalScores: { requirements: 4 }, notes: "ok", at: T });
  expect(s.report?.interviewer).toEqual({ finalScores: { requirements: 4 }, notes: "ok", confirmedAt: T });
});

test("chat/add keeps attached images and omits the field when there are none", async () => {
  const { createSession, reduce } = await import("./reducer");
  let s = createSession("이미지", "2026-11-05T00:00:00.000Z");
  s = reduce(s, { type: "chat/add", role: "user", text: "봐 주세요", images: ["data:image/jpeg;base64,QUJD"], at: "2026-11-05T00:01:00.000Z" });
  s = reduce(s, { type: "chat/add", role: "model", text: "네", at: "2026-11-05T00:01:05.000Z" });
  expect(s.build.chat[0].images).toEqual(["data:image/jpeg;base64,QUJD"]);
  expect("images" in s.build.chat[1]).toBe(false);
});

test("perf/record numbers records and resolves them as evidence", async () => {
  const { emptyPerf, toMetrics } = await import("../perf/metrics");
  const { resolveRef, listRefIds } = await import("./evidence");
  let s = createSession("측정", T);
  s = reduce(s, { type: "perf/record", at: T, label: "측정 1", metrics: toMetrics({ ...emptyPerf(), blockingMs: 1200 }) });
  s = reduce(s, { type: "perf/record", at: T, label: "측정 2", metrics: toMetrics({ ...emptyPerf(), blockingMs: 80 }) });
  expect(s.build.perf?.map((r) => r.id)).toEqual(["perf-1", "perf-2"]);
  expect(listRefIds(s)).toEqual(expect.arrayContaining(["perf-1", "perf-2"]));
  expect(resolveRef(s, "perf-2")).toMatchObject({ kind: "perf", label: "측정 2" });
});

test("perf/record works on sessions saved before perf existed", () => {
  const old = createSession("옛 세션", T);
  delete (old.build as { perf?: unknown }).perf;
  const s = reduce(old, { type: "perf/record", at: T, label: "측정 1", metrics: { commits: 0, lastCommitMs: 0, maxCommitMs: 0, longTasks: 0, maxLongTaskMs: 0, blockingMs: 0, maxInputMs: 0, lcpMs: null, domNodes: 0, apiCalls: 0, api429: 0, slowdown: 1 } });
  expect(s.build.perf).toHaveLength(1);
});
