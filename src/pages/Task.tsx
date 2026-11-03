import { App as AntApp, Button } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { askStakeholder } from "../ai";
import { ChatPanel } from "../components/ChatPanel";
import { PhaseGuard } from "../components/PhaseGuard";
import { QuestionBudget } from "../components/QuestionBudget";
import { Shell } from "../components/Shell";
import { SPEC_MIN_CHARS, SpecEditor } from "../components/SpecEditor";
import { remainingQuestions } from "../session/reducer";
import { useSession } from "../session/store";
import { bannerScheduleTask as task } from "../task/bannerSchedule";

function TaskInner() {
  const { session, dispatch, persistFile } = useSession();
  const { message, modal } = AntApp.useApp();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const s = session!;
  const remaining = remainingQuestions(s);
  const turns = s.clarify.qa.flatMap((q) => [
    { role: "user" as const, text: q.question },
    { role: "model" as const, text: q.answer },
  ]);

  const send = async (text: string) => {
    setPending(true);
    try {
      const answer = await askStakeholder(task, s, text);
      dispatch({ type: "qa/add", question: text, answer, at: new Date().toISOString() });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "실무진 답변을 받지 못했어요. 다시 보내 주세요.");
      throw e;
    } finally {
      setPending(false);
    }
  };

  const lock = () => {
    modal.confirm({
      title: "정의서를 확정할까요?",
      content: `확정하면 정의서를 바꿀 수 없고, 실무진에게 더 질문할 수 없어요. 남은 질문 ${remaining}번은 사라집니다.`,
      okText: "정의 확정",
      cancelText: "더 다듬기",
      onOk: async () => {
        dispatch({ type: "spec/lock", at: new Date().toISOString() });
        try {
          await persistFile();
        } catch {
          message.warning("세션 파일 저장에 실패했어요. 브라우저에는 저장됐어요.");
        }
        navigate("/build");
      },
    });
  };

  return (
    <Shell step={0} right={<span className="muted">{s.candidateName}</span>} wide>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(360px, 5fr)", height: "calc(100vh - 52px)" }}>
        <main style={{ overflowY: "auto", padding: "32px 40px 80px" }}>
          <h1 style={{ marginBottom: 20 }}>{task.title}</h1>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>마케팅팀 담당자가 보낸 메시지</div>
            <blockquote className="prose" style={{ margin: 0, padding: "14px 18px", background: "var(--frost)", borderRadius: 4, fontSize: 16, lineHeight: 1.7 }}>
              {task.requirementMessage}
            </blockquote>
          </div>

          <section className="prose" style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 8 }}>시작 코드</h3>
            <p className="muted">{task.starterNote}</p>
            <p className="muted" style={{ marginTop: 8 }}>
              이 메시지만으로는 정해지지 않은 게 많습니다. 오른쪽에서 실무진에게 물어보거나, 직접 정해서 아래 정의서에 적으세요.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 8 }}>해결책 정의서</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              확정하면 이 내용대로 구현하고, 제출 뒤에 이 결정들에 대해 질문을 받습니다.
            </p>
            <SpecEditor value={s.clarify.spec.text} onChange={(t) => dispatch({ type: "spec/edit", text: t })} locked={false} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <Button type="primary" size="large" disabled={s.clarify.spec.text.trim().length < SPEC_MIN_CHARS} onClick={lock}>
                정의 확정
              </Button>
            </div>
          </section>
        </main>

        <aside className="rail" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>AI 실무진에게 묻기</h3>
            <QuestionBudget total={s.clarify.questionLimit} used={s.clarify.qa.length} />
          </div>
          <ChatPanel
            turns={turns}
            onSend={send}
            pending={pending}
            pendingText="실무진이 답하고 있어요"
            disabled={remaining === 0}
            disabledText="질문을 다 썼어요. 나머지는 직접 정하세요."
            placeholder="콕 집어 물어보세요. 예: 겹치는 예약은 어떻게 할까요?"
            emptyText="아직 질문하지 않았어요. 모호한 부분부터 물어보세요. 서비스 규모, 사용 환경, 기한, 세부 동작 모두 물어볼 수 있어요."
            modelLabel="실무진"
          />
        </aside>
      </div>
    </Shell>
  );
}

export function TaskPage() {
  return (
    <PhaseGuard phase="clarify">
      <TaskInner />
    </PhaseGuard>
  );
}
