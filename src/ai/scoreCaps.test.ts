import { emptyPerf, toMetrics } from "../perf/metrics";
import { createSession, reduce } from "../session/reducer";
import type { Competency } from "../session/types";
import { applyCaps, scoreCaps } from "./scoreCaps";

const T = "2026-11-05T00:00:00.000Z";
const LONG = "VideoList.jsx 53행 generation ref로 늦게 온 응답을 버려요. signal을 못 받는 API라 취소 대신 이 방법을 골랐어요.";
const all5 = (): Competency[] =>
  (["requirements", "implementation", "ai_usage", "understanding", "extension"] as const).map((key) => ({ key, draftScore: 5, rationale: "", evidence: ["qa-1"] }));
const pass = (n: number) => Array.from({ length: 5 }, (_, i) => ({ item: `c${i}`, passed: i < n, evidence: [] }));

function session(opts: { qa?: number; perf?: boolean; followUp?: boolean; shortAnswer?: boolean }) {
  let s = createSession("a", T);
  for (let i = 0; i < (opts.qa ?? 3); i++) s = reduce(s, { type: "qa/add", question: "q", answer: "a", at: T });
  s = reduce(s, { type: "chat/add", role: "user", text: "u1", at: T });
  s = reduce(s, { type: "chat/add", role: "model", text: "m1", at: T });
  s = reduce(s, { type: "chat/add", role: "user", text: "u2", at: T });
  if (opts.perf ?? true) s = reduce(s, { type: "perf/record", at: T, label: "측정 1", metrics: toMetrics(emptyPerf()) });
  s = reduce(s, { type: "build/submit", at: T });
  s = reduce(s, {
    type: "review/setItems",
    items: [
      { id: "dq-1", kind: "ai_direction", question: "?", evidence: [] },
      { id: "dq-2", kind: "design", question: "?", evidence: [] },
      { id: "dq-3", kind: "extend", question: "?", evidence: [] },
    ],
  });
  for (const id of ["dq-1", "dq-2", "dq-3"]) s = reduce(s, { type: "review/answer", id, answer: opts.shortAnswer && id === "dq-3" ? "캐시요" : LONG, at: T });
  if (opts.followUp) {
    s = reduce(s, { type: "review/followUp", id: "dq-2", question: "왜요?" });
    s = reduce(s, { type: "review/answerFollowUp", id: "dq-2", answer: LONG });
  }
  return s;
}

test("a clean record keeps the AI scores", () => {
  const out = applyCaps(all5(), scoreCaps(session({}), pass(5)));
  expect(out.every((c) => c.draftScore === 5 && !c.capped)).toBe(true);
});

test("needing a follow-up caps understanding at 3 and says why", () => {
  const out = applyCaps(all5(), scoreCaps(session({ followUp: true }), pass(5)));
  const u = out.find((c) => c.key === "understanding")!;
  expect(u.draftScore).toBe(3);
  expect(u.capped).toEqual({ from: 5, reasons: ["dq-2에서 꼬리질문이 필요했어요"] });
});

test("implementation is capped by checklist passes and by missing measurements", () => {
  expect(applyCaps(all5(), scoreCaps(session({}), pass(2))).find((c) => c.key === "implementation")!.draftScore).toBe(2);
  expect(applyCaps(all5(), scoreCaps(session({ perf: false }), pass(5))).find((c) => c.key === "implementation")!.draftScore).toBe(3);
});

test("no questions to the stakeholder and a too-short extension answer are capped at 2", () => {
  const out = applyCaps(all5(), scoreCaps(session({ qa: 0, shortAnswer: true }), pass(5)));
  expect(out.find((c) => c.key === "requirements")!.draftScore).toBe(2);
  expect(out.find((c) => c.key === "extension")!.draftScore).toBe(2);
});

test("caps never raise a score", () => {
  const low = all5().map((c) => ({ ...c, draftScore: 1 as const }));
  expect(applyCaps(low, scoreCaps(session({ followUp: true }), pass(1))).every((c) => c.draftScore === 1)).toBe(true);
});
