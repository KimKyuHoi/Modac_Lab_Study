import { App as AntApp, Button, Tabs } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { askCodingAssistant } from "../ai";
import { ChatPanel } from "../components/ChatPanel";
import { PhaseGuard } from "../components/PhaseGuard";
import { PhaseTimer } from "../components/PhaseTimer";
import { SandpackWorkbench } from "../components/SandpackWorkbench";
import { Shell } from "../components/Shell";
import { SpecEditor } from "../components/SpecEditor";
import { useSession } from "../session/store";
import { bannerScheduleTask as task } from "../task/bannerSchedule";
import { visibleStarterFiles } from "../task/starterFiles";
import { candidateFiles } from "../session/files";

const SNAPSHOT_MS = 2 * 60 * 1000;

function lineCounts(files: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [p, c] of Object.entries(candidateFiles(files))) out[p] = c.split("\n").length;
  return out;
}

function BuildInner() {
  const { session, dispatch, persistFile } = useSession();
  const { message, modal } = AntApp.useApp();
  const navigate = useNavigate();
  const s = session!;
  const [pending, setPending] = useState(false);
  // 세션에 저장된 파일이 있으면 그걸로 이어서, 없으면 시작 코드
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

  const turns = s.build.chat.map((c) => ({ role: c.role, text: c.text }));

  const send = async (text: string) => {
    setPending(true);
    try {
      const reply = await askCodingAssistant(s, latestFiles.current, text);
      const at = new Date().toISOString();
      dispatch({ type: "chat/add", role: "user", text, at });
      dispatch({ type: "chat/add", role: "model", text: reply, at: new Date().toISOString() });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "도우미 답변을 받지 못했어요. 다시 보내 주세요.");
      throw e;
    } finally {
      setPending(false);
    }
  };

  const submit = () => {
    modal.confirm({
      title: "코드를 제출할까요?",
      content: "제출하면 더 고칠 수 없어요. 바로 이어서 이 코드에 대한 설계 질문 세 가지에 답하게 됩니다.",
      okText: "제출",
      cancelText: "더 만들기",
      onOk: async () => {
        dispatch({ type: "files/set", files: latestFiles.current });
        dispatch({ type: "snapshot/add", at: new Date().toISOString(), lines: lineCounts(latestFiles.current) });
        dispatch({ type: "build/submit", at: new Date().toISOString() });
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
      step={1}
      wide
      right={
        <>
          <PhaseTimer startedAt={s.build.startedAt ?? s.startedAt} budgetMin={task.timeBudgetMin.build} />
          <Button type="primary" onClick={submit}>
            제출
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 400px", height: "calc(100vh - 52px)" }}>
        <div style={{ minWidth: 0, minHeight: 0 }}>
          <SandpackWorkbench files={initialFiles} visibleFiles={visibleStarterFiles} activeFile="/src/Home.jsx" onFilesChange={onFilesChange} />
        </div>
        <aside className="rail" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Tabs
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
            tabBarStyle={{ margin: 0, padding: "0 20px" }}
            items={[
              {
                key: "assistant",
                label: "AI 도우미",
                children: (
                  <ChatPanel
                    turns={turns}
                    onSend={send}
                    pending={pending}
                    pendingText="도우미가 코드를 읽고 있어요"
                    placeholder="현재 파일을 보고 답합니다. 대화는 기록돼요."
                    emptyText="필요하면 도우미에게 맡기세요. 무엇을 맡기고 무엇을 직접 확인했는지가 기록에 남습니다."
                    modelLabel="도우미"
                  />
                ),
              },
              {
                key: "spec",
                label: "정의서와 과제",
                children: (
                  <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
                    <h3 style={{ marginBottom: 8 }}>확정한 정의서</h3>
                    <SpecEditor value={s.clarify.spec.text} onChange={() => {}} locked />
                    <h3 style={{ margin: "24px 0 8px" }}>원래 요청</h3>
                    <p className="prose muted">{task.requirementMessage}</p>
                    {s.clarify.qa.length > 0 && (
                      <>
                        <h3 style={{ margin: "24px 0 8px" }}>실무진 답변</h3>
                        <ol style={{ paddingLeft: 18, margin: 0 }}>
                          {s.clarify.qa.map((q) => (
                            <li key={q.id} style={{ marginBottom: 10, fontSize: 14 }}>
                              <div style={{ fontWeight: 600 }}>{q.question}</div>
                              <div className="muted">{q.answer}</div>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </aside>
      </div>
    </Shell>
  );
}

export function BuildPage() {
  return (
    <PhaseGuard phase="build">
      <BuildInner />
    </PhaseGuard>
  );
}
