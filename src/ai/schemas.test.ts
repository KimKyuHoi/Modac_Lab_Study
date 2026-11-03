import { designQuestionsSchema, followUpSchema, reportSchema } from "./schemas";

test("designQuestionsSchema rejects 1 question and accepts 2", () => {
  expect(designQuestionsSchema.safeParse({ questions: [{ question: "q", evidence: [] }] }).success).toBe(false);
  expect(
    designQuestionsSchema.safeParse({ questions: [{ question: "q1", evidence: ["spec"] }, { question: "q2", evidence: [] }] }).success,
  ).toBe(true);
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
  };
  expect(reportSchema.safeParse(good).success).toBe(true);
  expect(reportSchema.safeParse({ ...good, competencies: good.competencies.slice(0, 4) }).success).toBe(false);
  expect(reportSchema.safeParse({ ...good, competencies: [...good.competencies.slice(0, 4), { ...comp("extension"), draftScore: 6 }] }).success).toBe(false);
});
