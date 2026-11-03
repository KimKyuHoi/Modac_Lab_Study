import { App as AntApp, Button } from "antd";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { askCodingAssistant, askStakeholder } from "../ai";
import { ChatPanel } from "../components/ChatPanel";
import { PhaseGuard } from "../components/PhaseGuard";
import { PhaseTimer } from "../components/PhaseTimer";
import { QuestionBudget } from "../components/QuestionBudget";
import { ResizeHandle } from "../components/ResizeHandle";
import { SandpackWorkbench } from "../components/SandpackWorkbench";
import { Shell } from "../components/Shell";
import { candidateFiles } from "../session/files";
import { remainingQuestions } from "../session/reducer";
import { useSession } from "../session/store";
import { bannerScheduleTask as task } from "../task/bannerSchedule";
import { visibleStarterFiles } from "../task/starterFiles";

const SNAPSHOT_MS = 2 * 60 * 1000;
const WIDTH_KEY = "work:widths";
const MIN = 260;

function lineCounts(files: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [p, c] of Object.entries(candidateFiles(files))) out[p] = c.split("\n").length;
  return out;
}

function loadWidths(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (typeof v.left === "number" && typeof v.right === "number") return v;
    }
  } catch {
    /* 기본값 */
  }
  return { left: 400, right: 360 };
}

function WorkInner() {
  const { session, dispatch, persistFile } = useSession();
  const { message, modal } = AntApp.useApp();
  const navigate = useNavigate();
  const s = session!;
  const [askPending, setAskPending] = useState(false);
  const [helpPending, setHelpPending] = useState(false);
  const [widths, setWidths] = useState(loadWidths);
  const remaining = remainingQuestions(s);

  const resize = (side: "left" | "right", dx: number) =>
    setWidths((w) => {
      const maxSide = Math.max(MIN, window.innerWidth - MIN - 480 - (side === "left" ? w.right : w.left));
      const next = { ...w, [side]: Math.min(maxSide, Math.max(MIN, w[side] + (side === "left" ? dx : -dx))) };
      try {
        localStorage.setItem(WIDTH_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });

  // 세션 파일은 /src/ 만 저장되므로 템플릿 진입 파일(/index.js)은 항상 시작 코드에서 보탠다.
  const [initialFiles] = useState(() => (Object.keys(s.build.files).length > 0 ? { ...task.starterFiles, ...s.build.files } : task.starterFiles));
  const latestFiles = useRef<Record<string, string>>(candidateFiles(initialFiles));

  const onFilesChange = useCallback(
    (files: Record<string, string>) => {
      latestFiles.current = files;
      dispatch({ type: "files/set", files });
    },
    [dispatch],
  );

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "snapshot/add", at: new Date().toISOString(), lines: lineCounts(latestFiles.current) }), SNAPSHOT_MS);
    return () => clearInterval(id);
  }, [dispatch]);

  const qaTurns = s.clarify.qa.flatMap((q) => [
    { role: "user" as const, text: q.question },
    { role: "model" as const, text: q.answer },
  ]);
  const helpTurns = s.build.chat.map((c) => ({ role: c.role, text: c.text }));

  const ask = async (text: string) => {
    setAskPending(true);
    try {
      const answer = await askStakeholder(task, s, text);
      dispatch({ type: "qa/add", question: text, answer, at: new Date().toISOString() });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "실무진 답변을 받지 못했어요. 다시 보내 주세요.");
      throw e;
    } finally {
      setAskPending(false);
    }
  };

  const help = async (text: string) => {
    setHelpPending(true);
    try {
      const reply = await askCodingAssistant(s, latestFiles.current, text);
      dispatch({ type: "chat/add", role: "user", text, at: new Date().toISOString() });
      dispatch({ type: "chat/add", role: "model", text: reply, at: new Date().toISOString() });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "도우미 답변을 받지 못했어요. 다시 보내 주세요.");
      throw e;
    } finally {
      setHelpPending(false);
    }
  };

  const submit = () => {
    modal.confirm({
      title: "코드를 제출할까요?",
      content: `제출하면 코드를 더 고칠 수 없고, 실무진에게 더 질문할 수 없어요. 바로 이어서 AI가 당신의 기록과 코드를 읽고 만든 질문 세 가지에 답하게 됩니다.${remaining > 0 ? ` 남은 질문 ${remaining}번은 사라집니다.` : ""}`,
      okText: "제출",
      cancelText: "더 만들기",
      onOk: async () => {
        const at = new Date().toISOString();
        if (!s.clarify.spec.lockedAt) dispatch({ type: "spec/lock", at });
        dispatch({ type: "files/set", files: latestFiles.current });
        dispatch({ type: "snapshot/add", at, lines: lineCounts(latestFiles.current) });
        dispatch({ type: "build/submit", at });
        try {
          await persistFile();
        } catch {
          message.warning("세션 파일 저장에 실패했어요. 브라우저에는 저장됐어요.");
        }
        navigate("/review");
      },
    });
  };

  return (
    <Shell
      step={0}
      wide
      right={
        <>
          <span className="muted">{s.candidateName}</span>
          <PhaseTimer startedAt={s.startedAt} budgetMin={task.timeBudgetMin.build} />
          <Button type="primary" onClick={submit}>
            제출
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", height: "calc(100vh - 52px)", minWidth: 0 }}>
        <aside style={{ width: widths.left, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "12px 20px 10px", borderBottom: "1px solid var(--line)", maxHeight: "48vh", overflowY: "auto", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <h3 style={{ fontSize: 15 }}>{task.title}</h3>
              <QuestionBudget total={s.clarify.questionLimit} used={s.clarify.qa.length} />
            </div>
            <blockquote className="prose" style={{ margin: "0 0 8px", padding: "10px 12px", background: "var(--frost)", borderRadius: 4, fontSize: 14, lineHeight: 1.6 }}>
              <span className="muted" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>마케팅팀 담당자</span>
              {task.requirementMessage}
            </blockquote>
            <details open style={{ marginBottom: 8 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>서비스 기본 정보</summary>
              <dl style={{ margin: "6px 0 0", display: "grid", gridTemplateColumns: "84px 1fr", rowGap: 4, columnGap: 10, fontSize: 13 }}>
                {task.serviceProfile.map((p) => (
                  <Fragment key={p.label}>
                    <dt className="muted" style={{ fontWeight: 400 }}>{p.label}</dt>
                    <dd style={{ margin: 0 }}>{p.value}</dd>
                  </Fragment>
                ))}
              </dl>
            </details>
            <p className="muted" style={{ fontSize: 13 }}>
              {task.starterNote} 기능 세부는 정해지지 않은 게 많아요. 실무진에게 물어보고, 안 정해진 건 직접 정하세요.
            </p>
          </div>
          <ChatPanel
            turns={qaTurns}
            onSend={ask}
            pending={askPending}
            pendingText="실무진이 답하고 있어요"
            disabled={remaining === 0}
            disabledText="질문을 다 썼어요. 나머지는 직접 정하세요."
            placeholder="실무진에게 콕 집어 물어보세요. 예: 겹치는 예약은 어떻게 할까요?"
            emptyText="아직 질문하지 않았어요. 서비스 기본 정보는 위에 있으니, 기능 세부(국가 목록, 예약 방식, 겹침, 시간대, 동시 수정, 기본 배너 등)를 콕 집어 물어보세요."
            modelLabel="실무진"
          />
        </aside>
        <ResizeHandle label="왼쪽 패널 폭" onDelta={(dx) => resize("left", dx)} />
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <SandpackWorkbench files={initialFiles} visibleFiles={visibleStarterFiles} activeFile="/src/Home.jsx" onFilesChange={onFilesChange} />
        </div>
        <ResizeHandle label="오른쪽 패널 폭" onDelta={(dx) => resize("right", dx)} />
        <aside style={{ width: widths.right, flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
            <h3>AI 코딩 도우미</h3>
          </div>
          <ChatPanel
            turns={helpTurns}
            onSend={help}
            pending={helpPending}
            pendingText="도우미가 코드를 읽고 있어요"
            placeholder="현재 파일을 보고 답합니다. 대화는 기록돼요."
            emptyText="필요하면 도우미에게 맡기세요. 무엇을 맡기고 무엇을 직접 확인했는지가 기록에 남고, 제출 뒤 그걸로 질문을 받습니다."
            modelLabel="도우미"
          />
        </aside>
      </div>
    </Shell>
  );
}

export function WorkPage() {
  return (
    <PhaseGuard phase={["clarify", "build"]}>
      <WorkInner />
    </PhaseGuard>
  );
}
