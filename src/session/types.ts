export type Phase = "clarify" | "build" | "review" | "done";

/** "qa-3" | "chat-12" | "spec" | "dq-1" | "code:src/App.jsx:40-52" */
export type EvidenceRef = string;

export type QaTurn = { id: string; question: string; answer: string; at: string };
export type ChatTurn = { id: string; role: "user" | "model"; text: string; at: string };
export type Snapshot = { at: string; lines: Record<string, number> };

export type ReviewItem = {
  id: string;
  kind: "explain" | "extend";
  question: string;
  evidence: EvidenceRef[];
  answer?: string;
  followUp?: { question: string; answer?: string };
  answeredAt?: string;
};

export type CompetencyKey = "requirements" | "implementation" | "ai_usage" | "understanding" | "extension";

export type Competency = {
  key: CompetencyKey;
  draftScore: 1 | 2 | 3 | 4 | 5;
  rationale: string;
  evidence: EvidenceRef[];
};

export type ChecklistResult = { item: string; passed: boolean; evidence: EvidenceRef[] };

export type Report = {
  generatedAt: string;
  competencies: Competency[];
  checklist: ChecklistResult[];
  interviewQuestions: string[];
  interviewer?: { finalScores: Record<string, number>; notes: string; confirmedAt: string };
};

export type Session = {
  id: string;
  candidateName: string;
  taskId: "banner-schedule";
  phase: Phase;
  startedAt: string;
  clarify: {
    qa: QaTurn[];
    questionLimit: number;
    spec: { text: string; lockedAt?: string };
  };
  build: {
    startedAt?: string;
    chat: ChatTurn[];
    snapshots: Snapshot[];
    files: Record<string, string>;
    submittedAt?: string;
  };
  review: {
    startedAt?: string;
    items: ReviewItem[];
  };
  report?: Report;
};

export const COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  requirements: "요구사항 확정력",
  implementation: "구현 품질",
  ai_usage: "AI 활용",
  understanding: "구조 이해",
  extension: "확장 설계",
};
