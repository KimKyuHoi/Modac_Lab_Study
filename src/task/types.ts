export type Task = {
  id: string;
  title: string;
  requirementMessage: string;
  starterNote: string;
  /** 지원자에게 처음부터 공개되는 서비스 기본 스펙 */
  serviceProfile: { label: string; value: string }[];
  /** 실무진에게 물어야 알 수 있는 사실표 */
  facts: string[];
  personaRules: string[];
  extensionScenario: string;
  checklist: string[];
  starterFiles: Record<string, string>;
  /** 에디터에 보여 줄 파일. Sandpack 템플릿 기본 파일과 진입 파일은 숨긴다. */
  visibleFiles: string[];
  /** 에디터가 처음 여는 파일 */
  activeFile: string;
  /** 실무진 질문 칸이 비어 있을 때 보여 줄 안내 */
  askHint: string;
  timeBudgetMin: { build: number; review: number };
};
