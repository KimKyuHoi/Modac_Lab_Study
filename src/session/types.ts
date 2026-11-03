export type Phase = "clarify" | "build" | "review" | "done";

/** "qa-3" | "chat-12" | "spec" | "dq-1" | "code:src/App.jsx:40-52" */
export type EvidenceRef = string;

export type QaTurn = { id: string; question: string; answer: string; at: string };
export type ChatTurn = { id: string; role: "user" | "model"; text: string; at: string };
export type Snapshot = { at: string; lines: Record<string, number> };

export type ReviewItem = {
  id: string;
  kind: "ai_direction" | "design" | "extend";
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

/** 이 지원자가 특히 고민하거나 설계한 지점. 사람마다 다르게 뽑힌다. */
export type Highlight = { title: string; detail: string; evidence: EvidenceRef[] };

export type Report = {
  generatedAt: string;
  competencies: Competency[];
  checklist: ChecklistResult[];
  interviewQuestions: string[];
  highlights: Highlight[];
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
  requirements: "요구사항 구체화",
  implementation: "구현 품질",
  ai_usage: "AI 활용",
  understanding: "구조 이해",
  extension: "확장 설계",
};
