import { z } from "zod";

const COMPETENCY_KEYS = ["requirements", "implementation", "ai_usage", "understanding", "extension"] as const;

export const designQuestionsSchema = z.object({
  questions: z
    .array(z.object({ question: z.string().min(1), evidence: z.array(z.string()) }))
    .length(2),
});

export const followUpSchema = z.object({
  ambiguous: z.boolean(),
  followUp: z.string().optional(),
});

export const reportSchema = z
  .object({
    competencies: z
      .array(
        z.object({
          key: z.enum(COMPETENCY_KEYS),
          draftScore: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
          rationale: z.string(),
          evidence: z.array(z.string()),
        }),
      )
      .length(5),
    checklist: z.array(z.object({ item: z.string(), passed: z.boolean(), evidence: z.array(z.string()) })),
    interviewQuestions: z.array(z.string()),
  })
  .refine((r) => new Set(r.competencies.map((c) => c.key)).size === 5, { message: "역량 5개가 모두 있어야 해요." });

export type DesignQuestionsOut = z.infer<typeof designQuestionsSchema>;
export type FollowUpOut = z.infer<typeof followUpSchema>;
export type ReportOut = z.infer<typeof reportSchema>;

// Gemini responseJsonSchema용 (zod와 같은 모양을 손으로 유지)
const evidence = { type: "array", items: { type: "string" } };

export const designQuestionsJsonSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "object", properties: { question: { type: "string" }, evidence }, required: ["question", "evidence"] },
    },
  },
  required: ["questions"],
};

export const followUpJsonSchema = {
  type: "object",
  properties: { ambiguous: { type: "boolean" }, followUp: { type: "string" } },
  required: ["ambiguous"],
};

export const reportJsonSchema = {
  type: "object",
  properties: {
    competencies: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: [...COMPETENCY_KEYS] },
          draftScore: { type: "integer", minimum: 1, maximum: 5 },
          rationale: { type: "string" },
          evidence,
        },
        required: ["key", "draftScore", "rationale", "evidence"],
      },
    },
    checklist: {
      type: "array",
      items: { type: "object", properties: { item: { type: "string" }, passed: { type: "boolean" }, evidence }, required: ["item", "passed", "evidence"] },
    },
    interviewQuestions: { type: "array", items: { type: "string" } },
  },
  required: ["competencies", "checklist", "interviewQuestions"],
};
