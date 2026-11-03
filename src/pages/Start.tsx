import { Alert, Button, Input } from "antd";
import { routeForPhase } from "../components/PhaseGuard";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isConfigured } from "../ai";
import { Shell } from "../components/Shell";
import { useSession } from "../session/store";
import { bannerScheduleTask } from "../task/bannerSchedule";

const STEPS: { name: string; detail: string }[] = [
  { name: "과제 읽기와 질문", detail: "마케팅 담당자의 요청을 읽고, AI 실무진에게 5번까지 물어봅니다." },
  { name: "해결책 정의", detail: "무엇을 어떻게 만들지 스스로 정해서 적습니다. 정하지 않은 건 당신이 정합니다." },
  { name: "구현", detail: `브라우저 에디터에서 만듭니다. AI 코딩 도우미를 쓸 수 있고 대화는 기록됩니다. 약 ${bannerScheduleTask.timeBudgetMin.build}분.` },
  { name: "설계 질의", detail: `제출 직후 AI가 코드에 대해 세 가지를 묻습니다. 약 ${bannerScheduleTask.timeBudgetMin.review}분.` },
  { name: "리포트", detail: "역량별 점수 초안과 근거가 나옵니다. 최종 판단은 면접관이 합니다." },
];

export function StartPage() {
  const [name, setName] = useState("");
  const { start, session } = useSession();
  const inProgress = session && session.phase !== "done" ? session : null;
  const navigate = useNavigate();
  const configured = isConfigured();

  const begin = () => {
    start(name.trim());
    navigate("/task");
  };

  return (
    <Shell right={<Link to="/sessions">세션 목록</Link>}>
      <main style={{ padding: "64px 24px 80px", maxWidth: 720 }}>
        {!configured && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 32 }}
            message="Gemini API 키가 설정되지 않았어요."
            description=".env.local 파일에 VITE_GEMINI_API_KEY를 넣고 개발 서버를 다시 시작하세요. 키가 없으면 AI 실무진과 도우미가 답하지 못합니다."
          />
        )}
        {inProgress && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderLeft: "4px solid var(--pink)", background: "var(--frost)", marginBottom: 32 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>진행 중인 세션이 있어요: {inProgress.candidateName}</div>
              <div className="muted" style={{ fontSize: 14 }}>새로 시작하면 이 세션은 세션 목록에만 남고 이어서 할 수 없어요.</div>
            </div>
            <Button type="primary" onClick={() => navigate(routeForPhase(inProgress))}>
              이어서 진행
            </Button>
          </div>
        )}
        <h1 style={{ fontSize: 34, marginBottom: 12 }}>애매한 요청을 받아서, 직접 정하고, 만들고, 설명합니다.</h1>
        <p className="prose muted" style={{ fontSize: 17, marginBottom: 40 }}>
          실제 업무처럼 요구사항은 처음부터 명확하지 않습니다. 무엇을 물어볼지, 무엇을 스스로 정할지, 그리고 왜 그렇게 만들었는지가 평가 대상입니다.
        </p>

        <ol style={{ margin: "0 0 40px", padding: 0, listStyle: "none", borderTop: "1px solid var(--line)" }}>
          {STEPS.map((s, i) => (
            <li key={s.name} style={{ display: "grid", gridTemplateColumns: "32px 180px 1fr", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontWeight: 700, color: "var(--muted)" }}>{i + 1}</span>
              <span style={{ fontWeight: 700 }}>{s.name}</span>
              <span className="muted">{s.detail}</span>
            </li>
          ))}
        </ol>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) begin();
          }}
          style={{ display: "flex", gap: 12, alignItems: "flex-end", maxWidth: 480 }}
        >
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontWeight: 600 }}>
            이름
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="리포트에 표시됩니다" size="large" autoFocus />
          </label>
          <Button type="primary" size="large" htmlType="submit" disabled={!name.trim()}>
            응시 시작
          </Button>
        </form>
      </main>
    </Shell>
  );
}
