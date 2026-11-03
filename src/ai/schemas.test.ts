import { designQuestionsSchema, followUpSchema, reportSchema } from "./schemas";

test("designQuestionsSchema requires exactly 3 questions with a kind each", () => {
  const q = (kind: string) => ({ kind, question: "q", evidence: ["qa-1"] });
  expect(designQuestionsSchema.safeParse({ questions: [q("design"), q("extend")] }).success).toBe(false);
  expect(designQuestionsSchema.safeParse({ questions: [q("ai_direction"), q("design"), q("extend")] }).success).toBe(true);
  expect(designQuestionsSchema.safeParse({ questions: [q("ai_direction"), q("design"), q("nope")] }).success).toBe(false);
});

test("followUpSchema accepts ambiguous with followUp", () => {
  expect(followUpSchema.safeParse({ ambiguous: true, followUp: "어디?" }).success).toBe(true);
  expect(followUpSchema.safeParse({ ambiguous: "yes" }).success).toBe(false);
});

test("reportSchema requires 5 competencies with scores 1-5 and evidence arrays", () => {
  const comp = (key: string) => ({ key, draftScore: 3, rationale: "r", evidence: ["spec"] });
  const good = {
    competencies: ["requirements", "implementation", "ai_usage", "understanding", "extension"].map(comp),
    checklist: [{ item: "a", passed: true, evidence: [] }],
    interviewQuestions: ["q"],
    highlights: [{ title: "겹침 규칙", detail: "등록일 우선으로 정함", evidence: ["qa-1"] }],
  };
  expect(reportSchema.safeParse(good).success).toBe(true);
  expect(reportSchema.safeParse({ ...good, highlights: undefined }).success).toBe(false);
  expect(reportSchema.safeParse({ ...good, competencies: good.competencies.slice(0, 4) }).success).toBe(false);
  expect(reportSchema.safeParse({ ...good, competencies: [...good.competencies.slice(0, 4), { ...comp("extension"), draftScore: 6 }] }).success).toBe(false);
});
