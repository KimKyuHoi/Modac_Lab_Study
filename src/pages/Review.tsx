import { App as AntApp, Button } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateDesignQuestions, generateReport, judgeFollowUp } from "../ai";
import { DesignQuestionCard } from "../components/DesignQuestionCard";
import { PhaseGuard } from "../components/PhaseGuard";
import { PhaseTimer } from "../components/PhaseTimer";
import { Shell } from "../components/Shell";
import { useSession } from "../session/store";
import type { ReviewItem } from "../session/types";
import { bannerScheduleTask as task } from "../task/bannerSchedule";

function isDone(i: ReviewItem): boolean {
  return i.answer !== undefined && (!i.followUp || i.followUp.answer !== undefined);
}

type Stage = "loading-questions" | "answering" | "generating-report" | "error";

function ReviewInner() {
  const { session, current, dispatch, persistFile } = useSession();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const s = session!;
  const [stage, setStage] = useState<Stage>(s.review.items.length ? "answering" : "loading-questions");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [judgingId, setJudgingId] = useState<string | null>(null);
  const started = useRef(false);

  const loadQuestions = async () => {
    setStage("loading-questions");
    setError("");
    try {
      const items = await generateDesignQuestions(task, s);
      dispatch({ type: "review/setItems", items });
      setStage("answering");
    } catch (e) {
      setError(e instanceof Error ? e.message : "질문을 만들지 못했어요.");
      setStage("error");
    }
  };

  const finish = async () => {
    setStage("generating-report");
    setError("");
    try {
      const report = await generateReport(task, current() ?? s);
      dispatch({ type: "report/set", report });
      try {
        await persistFile();
      } catch {
        message.warning("세션 파일 저장에 실패했어요. 브라우저에는 저장됐어요.");
      }
      navigate(`/report/${s.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "리포트를 만들지 못했어요.");
      setStage("error");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (s.review.items.length === 0) void loadQuestions();
    else if (s.review.items.every(isDone)) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = s.review.items;
  // 판단 중인 문항은 답이 저장돼 있어도 활성 상태를 유지한다.
  const activeIndex = judgingId ? items.findIndex((i) => i.id === judgingId) : items.findIndex((i) => !isDone(i));

  const answer = async (item: ReviewItem, text: string) => {
    setBusy(true);
    setJudgingId(item.id);
    const at = new Date().toISOString();
    const afterAnswer = dispatch({ type: "review/answer", id: item.id, answer: text, at });
    try {
      const judged = await judgeFollowUp({ ...item, answer: text }, afterAnswer ?? s);
      if (judged.ambiguous && judged.followUp) {
        dispatch({ type: "review/followUp", id: item.id, question: judged.followUp });
        setJudgingId(null);
        setBusy(false);
        return;
      }
    } catch {
      /* 꼬리질문 판단 실패는 응시를 막지 않는다 */
    }
    setJudgingId(null);
    setBusy(false);
    advance(afterAnswer?.review.items ?? items, item.id);
  };

  const answerFollowUp = (item: ReviewItem, text: string) => {
    const next = dispatch({ type: "review/answerFollowUp", id: item.id, answer: text });
    advance(next?.review.items ?? items, item.id);
  };

  const advance = (list: ReviewItem[], justId: string) => {
    const remaining = list.filter((i) => i.id !== justId && !isDone(i));
    if (remaining.length === 0) void finish();
  };

  return (
    <Shell step={1} right={<PhaseTimer startedAt={s.review.startedAt ?? s.startedAt} budgetMin={task.timeBudgetMin.review} overtimeText="시간이 지났어요. 답변은 계속할 수 있어요." />}>
      <main style={{ padding: "40px 24px 80px", maxWidth: 860 }}>
        <h1 style={{ marginBottom: 8 }}>당신의 기록과 코드를 읽고 세 가지를 묻습니다</h1>
        <p className="muted" style={{ marginBottom: 32 }}>
          AI에게 시킨 것, 설계 결정, 확장 설계에 대해 하나씩. 답이 모호하면 꼬리질문이 한 번 더 붙습니다. 코드는 다시 볼 수 없으니 기억을 바탕으로 적으세요.
        </p>

        {stage === "loading-questions" && <p className="muted">실무진 질문, 도우미 대화, 제출 코드를 읽고 당신에게 맞는 질문을 만들고 있어요.</p>}
        {stage === "generating-report" && <p className="muted">기록 전체를 읽고 리포트를 쓰고 있어요. 1분쯤 걸릴 수 있어요.</p>}
        {stage === "error" && (
          <div style={{ padding: 16, border: "1px solid var(--pink)", borderRadius: 4, marginBottom: 24 }}>
            <p style={{ marginBottom: 12 }}>{error}</p>
            <Button type="primary" onClick={() => (items.length === 0 ? loadQuestions() : finish())}>
              다시 시도
            </Button>
          </div>
        )}

        {items.map((item, i) => (
          <DesignQuestionCard
            key={item.id}
            item={item}
            index={i}
            active={stage === "answering" && i === activeIndex}
            busy={busy}
            judging={judgingId === item.id}
            onAnswer={(t) => void answer(item, t)}
            onAnswerFollowUp={(t) => answerFollowUp(item, t)}
          />
        ))}
      </main>
    </Shell>
  );
}

export function ReviewPage() {
  return (
    <PhaseGuard phase="review">
      <ReviewInner />
    </PhaseGuard>
  );
}
