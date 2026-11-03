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
