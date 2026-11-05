import type { Task } from "../task";
import type { Report, ReviewItem, Session } from "../session/types";
import { filterExisting } from "../session/evidence";
import { applyCaps, scoreCaps } from "./scoreCaps";
import { callJson, callText, type Turn } from "./gemini";
import { assistantSystem, designQuestionsPrompt, editNote, followUpPrompt, reportPrompt, stakeholderSystem } from "./prompts";
import {
  assistantReplyJsonSchema,
  assistantReplySchema,
  designQuestionsJsonSchema,
  designQuestionsSchema,
  followUpJsonSchema,
  followUpSchema,
  reportJsonSchema,
  reportSchema,
} from "./schemas";

export { isConfigured, modelName, type ModelRole } from "./gemini";

export async function askStakeholder(task: Task, s: Session, question: string): Promise<string> {
  const turns: Turn[] = [];
  for (const q of s.clarify.qa) {
    turns.push({ role: "user", text: q.question }, { role: "model", text: q.answer });
  }
  turns.push({ role: "user", text: question });
  return callText("stakeholder", stakeholderSystem(task), turns);
}

export type AssistantEdit = { path: string; content: string };

/** 도우미가 준 파일 변경 중 적용할 수 있는 것만 남긴다: /src 아래 js·jsx·css, 내용이 실제로 바뀐 것. */
export function sanitizeEdits(edits: AssistantEdit[], files: Record<string, string>): AssistantEdit[] {
  const out = new Map<string, string>();
  for (const e of edits) {
    const raw = e.path.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    const path = `/${raw.startsWith("src/") ? raw : `src/${raw}`}`;
    if (!/^\/src\/[\w./-]+\.(jsx?|css)$/.test(path) || path.split("/").some((seg) => seg === "..")) continue;
    const content = e.content.endsWith("\n") ? e.content : `${e.content}\n`;
    if (files[path] === content) continue;
    out.set(path, content);
  }
  return [...out.entries()].map(([path, content]) => ({ path, content }));
}

export async function askCodingAssistant(
  s: Session,
  files: Record<string, string>,
  message: string,
  images: string[] = [],
): Promise<{ reply: string; edits: AssistantEdit[] }> {
  const turns: Turn[] = s.build.chat.map((c) => ({ role: c.role, text: c.text + editNote(c.edits), images: c.images }));
  turns.push({ role: "user", text: message || "(화면 캡처를 봐 주세요)", images });
  const out = await callJson("assistant", assistantSystem(files), turns, assistantReplyJsonSchema, (raw) => assistantReplySchema.parse(raw));
  return { reply: out.reply, edits: sanitizeEdits(out.edits, files) };
}

export async function generateDesignQuestions(task: Task, s: Session): Promise<ReviewItem[]> {
  const { system, user } = designQuestionsPrompt(s, task);
  const out = await callJson("judge", system, [{ role: "user", text: user }], designQuestionsJsonSchema, (raw) => designQuestionsSchema.parse(raw));
  return out.questions.map((q, i) => ({
    id: `dq-${i + 1}`,
    kind: q.kind,
    question: q.question,
    evidence: filterExisting(s, q.evidence),
  }));
}

export async function judgeFollowUp(item: ReviewItem, s: Session): Promise<{ ambiguous: boolean; followUp?: string }> {
  const { system, user } = followUpPrompt(item, s);
  const out = await callJson("judge", system, [{ role: "user", text: user }], followUpJsonSchema, (raw) => followUpSchema.parse(raw));
  if (out.ambiguous && out.followUp?.trim()) return { ambiguous: true, followUp: out.followUp.trim() };
  return { ambiguous: false };
}

export async function generateReport(task: Task, s: Session): Promise<Report> {
  const { system, user } = reportPrompt(s, task);
  const out = await callJson("judge", system, [{ role: "user", text: user }], reportJsonSchema, (raw) => reportSchema.parse(raw));
  const checklist = out.checklist.map((c) => ({ ...c, evidence: filterExisting(s, c.evidence) }));
  const competencies = out.competencies.map((c) => ({ ...c, evidence: filterExisting(s, c.evidence) }));
  return {
    generatedAt: new Date().toISOString(),
    competencies: applyCaps(competencies, scoreCaps(s, checklist)),
    checklist,
    interviewQuestions: out.interviewQuestions,
    highlights: out.highlights.map((h) => ({ ...h, evidence: filterExisting(s, h.evidence) })),
  };
}
