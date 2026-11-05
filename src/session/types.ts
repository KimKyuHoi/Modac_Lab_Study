import type { PerfMetrics } from "../perf/metrics";

export type Phase = "clarify" | "build" | "review" | "done";

/** "qa-3" | "chat-12" | "spec" | "dq-1" | "code:src/App.jsx:40-52" */
export type EvidenceRef = string;

export type QaTurn = { id: string; question: string; answer: string; at: string };
/** 도우미가 에디터에 직접 적용한 파일 변경. before가 null이면 새로 만든 파일. */
export type AppliedEdit = { path: string; before: string | null; after: string; reverted?: boolean };
/** images: 지원자가 붙여넣은 화면 캡처(축소한 JPEG data URL). edits: 도우미가 에디터에 바로 적용한 변경. */
export type ChatTurn = { id: string; role: "user" | "model"; text: string; at: string; images?: string[]; edits?: AppliedEdit[] };
export type Snapshot = { at: string; lines: Record<string, number> };
/** 지원자가 성능 패널에서 "지금 수치 기록"을 누르거나 제출할 때 남는 측정값 */
export type PerfRecord = { id: string; at: string; label: string; metrics: PerfMetrics };

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
  /** 기록으로 확인되는 상한 때문에 AI 점수를 깎았을 때 */
  capped?: { from: number; reasons: string[] };
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
  taskId: string;
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
    /** 이전 버전 세션에는 없을 수 있다 */
    perf?: PerfRecord[];
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
  understanding: "판단 근거 (왜)",
  extension: "확장 설계",
};
