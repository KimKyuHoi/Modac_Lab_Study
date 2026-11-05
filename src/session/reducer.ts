import { ulid } from "ulid";
import { currentTask } from "../task";
import type { PerfMetrics } from "../perf/metrics";
import type { Report, ReviewItem, Session } from "./types";

export const QUESTION_LIMIT = 5;

export type Action =
  | { type: "qa/add"; question: string; answer: string; at: string }
  | { type: "spec/edit"; text: string }
  | { type: "spec/lock"; at: string }
  | { type: "chat/add"; role: "user" | "model"; text: string; at: string; images?: string[] }
  | { type: "snapshot/add"; at: string; lines: Record<string, number> }
  | { type: "perf/record"; at: string; label: string; metrics: PerfMetrics }
  | { type: "files/set"; files: Record<string, string> }
  | { type: "build/submit"; at: string }
  | { type: "review/setItems"; items: ReviewItem[] }
  | { type: "review/answer"; id: string; answer: string; at: string }
  | { type: "review/followUp"; id: string; question: string }
  | { type: "review/answerFollowUp"; id: string; answer: string }
  | { type: "report/set"; report: Report }
  | { type: "report/confirm"; finalScores: Record<string, number>; notes: string; at: string };

export function createSession(candidateName: string, now: string = new Date().toISOString()): Session {
  return {
    id: ulid(),
    candidateName,
    taskId: currentTask.id,
    phase: "clarify",
    startedAt: now,
    clarify: { qa: [], questionLimit: QUESTION_LIMIT, spec: { text: "" } },
    build: { chat: [], snapshots: [], perf: [], files: {} },
    review: { items: [] },
  };
}

export function remainingQuestions(s: Session): number {
  return Math.max(0, s.clarify.questionLimit - s.clarify.qa.length);
}

function patchItem(s: Session, id: string, patch: (i: ReviewItem) => ReviewItem): Session {
  return { ...s, review: { ...s.review, items: s.review.items.map((i) => (i.id === id ? patch(i) : i)) } };
}

export function reduce(s: Session, a: Action): Session {
  switch (a.type) {
    case "qa/add": {
      if (remainingQuestions(s) === 0) return s;
      const id = `qa-${s.clarify.qa.length + 1}`;
      return { ...s, clarify: { ...s.clarify, qa: [...s.clarify.qa, { id, question: a.question, answer: a.answer, at: a.at }] } };
    }
    case "spec/edit":
      if (s.clarify.spec.lockedAt) return s;
      return { ...s, clarify: { ...s.clarify, spec: { ...s.clarify.spec, text: a.text } } };
    case "spec/lock":
      return {
        ...s,
        phase: "build",
        clarify: { ...s.clarify, spec: { ...s.clarify.spec, lockedAt: a.at } },
        build: { ...s.build, startedAt: a.at },
      };
    case "perf/record": {
      const perf = s.build.perf ?? [];
      const id = `perf-${perf.length + 1}`;
      return { ...s, build: { ...s.build, perf: [...perf, { id, at: a.at, label: a.label, metrics: a.metrics }] } };
    }
    case "chat/add": {
      const id = `chat-${s.build.chat.length + 1}`;
      return { ...s, build: { ...s.build, chat: [...s.build.chat, { id, role: a.role, text: a.text, at: a.at, ...(a.images?.length ? { images: a.images } : {}) }] } };
    }
    case "snapshot/add":
      return { ...s, build: { ...s.build, snapshots: [...s.build.snapshots, { at: a.at, lines: a.lines }] } };
    case "files/set":
      return { ...s, build: { ...s.build, files: a.files } };
    case "build/submit":
      return { ...s, phase: "review", build: { ...s.build, submittedAt: a.at }, review: { ...s.review, startedAt: a.at } };
    case "review/setItems":
      return { ...s, review: { ...s.review, items: a.items } };
    case "review/answer":
      return patchItem(s, a.id, (i) => ({ ...i, answer: a.answer, answeredAt: a.at }));
    case "review/followUp":
      return patchItem(s, a.id, (i) => ({ ...i, followUp: { question: a.question } }));
    case "review/answerFollowUp":
      return patchItem(s, a.id, (i) => (i.followUp ? { ...i, followUp: { ...i.followUp, answer: a.answer } } : i));
    case "report/set":
      return { ...s, phase: "done", report: a.report };
    case "report/confirm":
      if (!s.report) return s;
      return { ...s, report: { ...s.report, interviewer: { finalScores: a.finalScores, notes: a.notes, confirmedAt: a.at } } };
    default:
      return s;
  }
}
