import { App as AntApp, Button, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { RecordViewer, type Focus } from "../components/RecordViewer";
import { useNavigate } from "react-router-dom";
import { generateDesignQuestions, generateReport, judgeFollowUp } from "../ai";
import { DesignQuestionCard } from "../components/DesignQuestionCard";
import { PhaseGuard } from "../components/PhaseGuard";
import { PhaseTimer } from "../components/PhaseTimer";
import { Shell } from "../components/Shell";
import { useSession } from "../session/store";
import type { ReviewItem } from "../session/types";
import { currentTask as task } from "../task";

function isDone(i: ReviewItem): boolean {
  return i.answer !== undefined && (!i.followUp || i.followUp.answer !== undefined);
}

type Stage = "loading-questions" | "answering" | "generating-report" | "error";

function ReviewInner() {
  const { session, current, dispatch, persistFile } = useSession();
  const { message, modal } = AntApp.useApp();
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
  };

  const answerFollowUp = (item: ReviewItem, text: string) => {
    dispatch({ type: "review/answerFollowUp", id: item.id, answer: text });
  };

  const [focus, setFocus] = useState<Focus>(null);
  const openRef = (ref: string) => setFocus((f) => ({ ref, n: (f?.n ?? 0) + 1 }));
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
  // 다음 질문으로 넘어가면 그 질문의 첫 코드 근거를 자동으로 연다.
  const shownFor = useRef<string | null>(null);
  useEffect(() => {
    if (stage !== "answering" || !activeItem || shownFor.current === activeItem.id) return;
    shownFor.current = activeItem.id;
    const first = activeItem.evidence.find((r) => r.startsWith("code:")) ?? activeItem.evidence[0];
    if (first) openRef(first);
  }, [stage, activeItem]);

  // 마지막 답을 저장해도 바로 리포트를 만들지 않는다. 응시자가 답을 다시 보고 최종 제출한다.
  const allDone = items.length > 0 && items.every(isDone) && !judgingId;
  const submitFinal = () => {
    modal.confirm({
      title: "최종 제출할까요?",
      content: "제출하면 답변을 고칠 수 없고, 바로 리포트를 만들어요.",
      okText: "최종 제출",
      cancelText: "답변 다시 보기",
      onOk: () => void finish(),
    });
  };

  return (
    <Shell step={1} wide right={<PhaseTimer startedAt={s.review.startedAt ?? s.startedAt} budgetMin={task.timeBudgetMin.review} overtimeText="시간이 지났어요. 답변은 계속할 수 있어요." />}>
      <div className="review-layout">
      <main className="review-questions">
        <h1 style={{ marginBottom: 24 }}>설계 질의</h1>

        {stage === "loading-questions" && <Spin aria-label="질문을 만드는 중" />}
        {stage === "generating-report" && (
          <p className="muted" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Spin size="small" /> 리포트를 쓰고 있어요
          </p>
        )}
        {stage === "error" && (
          <div style={{ padding: 16, border: "1px solid var(--accent)", borderRadius: 4, marginBottom: 24 }}>
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
            onOpenRef={openRef}
          />
        ))}
        {stage === "answering" && allDone && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Button type="primary" size="large" onClick={submitFinal}>
              최종 제출
            </Button>
          </div>
        )}
      </main>
      <aside className="review-records" aria-label="내 기록">
        <RecordViewer session={s} focus={focus} highlightRefs={activeItem?.evidence ?? []} />
      </aside>
      </div>
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
