import type { ChecklistResult, Competency, CompetencyKey, Session } from "../session/types";

/**
 * AI 초안 점수에 기록으로 확인되는 상한을 건다. 프롬프트만으로는 점수가 후하게 나와서,
 * 기록이 뒷받침하지 않는 높은 점수는 코드로 깎는다. 깎은 이유는 리포트에 그대로 보인다.
 */
export type Cap = { max: number; reason: string };

const SHORT_ANSWER = 60; // 이보다 짧은 답은 구체적인 설명이라 보기 어렵다

function answerLen(s?: string) {
  return (s ?? "").trim().length;
}

export function scoreCaps(s: Session, checklist: ChecklistResult[]): Partial<Record<CompetencyKey, Cap[]>> {
  const caps: Partial<Record<CompetencyKey, Cap[]>> = {};
  const add = (k: CompetencyKey, max: number, reason: string) => (caps[k] ??= []).push({ max, reason });

  // 요구사항 구체화: 묻지 않았으면 구체화했다고 볼 근거가 없다
  const qa = s.clarify.qa.length;
  if (qa === 0) add("requirements", 2, "실무진에게 한 번도 묻지 않았어요");
  else if (qa === 1) add("requirements", 3, "실무진 질문이 1번뿐이에요");

  // 구현 품질: 체크리스트 통과 수를 넘을 수 없다. 측정 없이 성능을 고쳤다고 볼 수 없다.
  const passed = checklist.filter((c) => c.passed).length;
  if (passed < 5) add("implementation", Math.max(1, passed), `체크리스트 ${passed}/${checklist.length} 통과`);
  const measured = (s.build.perf ?? []).filter((r) => r.label !== "제출 시점").length;
  if (measured === 0) add("implementation", 3, "성능을 직접 측정한 기록이 없어요");

  // AI 활용: 도우미 답을 받기만 하고 되묻거나 확인한 흔적이 없으면 높게 줄 수 없다
  const userTurns = s.build.chat.filter((c) => c.role === "user").length;
  if (userTurns === 1) add("ai_usage", 4, "도우미와 한 번만 주고받아 검증 과정을 확인하기 어려워요");

  // 판단 근거·확장 설계: 꼬리질문이 필요했으면 첫 답이 모호했다는 뜻이다
  for (const item of s.review.items) {
    const key: CompetencyKey = item.kind === "extend" ? "extension" : "understanding";
    if (!item.answer || answerLen(item.answer) < SHORT_ANSWER) add(key, 2, `${item.id} 답이 비었거나 너무 짧아요`);
    if (item.followUp) {
      add(key, 3, `${item.id}에서 꼬리질문이 필요했어요`);
      if (answerLen(item.followUp.answer) < SHORT_ANSWER) add(key, 2, `${item.id} 꼬리질문 답이 비었거나 너무 짧아요`);
    }
  }
  return caps;
}

/** 상한을 적용한다. 원래 AI 점수와 깎인 이유를 함께 남긴다. */
export function applyCaps(competencies: Competency[], caps: Partial<Record<CompetencyKey, Cap[]>>): Competency[] {
  return competencies.map((c) => {
    const list = caps[c.key] ?? [];
    if (list.length === 0) return c;
    const tightest = list.reduce((a, b) => (b.max < a.max ? b : a));
    if (c.draftScore <= tightest.max) return c;
    return {
      ...c,
      draftScore: tightest.max as Competency["draftScore"],
      capped: { from: c.draftScore, reasons: list.filter((x) => x.max < c.draftScore).map((x) => x.reason) },
    };
  });
}
