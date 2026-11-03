import { Button, Table, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { listFiles, listLocal } from "../session/persist";
import { useSession } from "../session/store";
import type { Session } from "../session/types";
import { routeForPhase } from "../components/PhaseGuard";

function avgDraft(s: Session): string {
  const c = s.report?.competencies ?? [];
  if (c.length === 0) return "";
  return (c.reduce((n, x) => n + x.draftScore, 0) / c.length).toFixed(1);
}

function avgFinal(s: Session): string {
  const f = s.report?.interviewer?.finalScores;
  if (!f) return "";
  const v = Object.values(f);
  return v.length ? (v.reduce((n, x) => n + x, 0) / v.length).toFixed(1) : "";
}

const PHASE_LABEL: Record<Session["phase"], string> = { clarify: "질문 중", build: "구현 중", review: "설계 질의 중", done: "완료" };

export function SessionsPage() {
  const [fromFiles, setFromFiles] = useState<Session[]>([]);
  const { load } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    listFiles().then(setFromFiles).catch(() => setFromFiles([]));
  }, []);

  const rows = useMemo(() => {
    const byId = new Map<string, Session>();
    for (const s of fromFiles) byId.set(s.id, s);
    for (const s of listLocal()) {
      const prev = byId.get(s.id);
      // 더 진행된 쪽을 남긴다
      if (!prev || JSON.stringify(s).length >= JSON.stringify(prev).length) byId.set(s.id, s);
    }
    return [...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [fromFiles]);

  const open = (s: Session) => {
    load(s);
    navigate(routeForPhase(s));
  };

  return (
    <Shell right={<Link to="/">처음으로</Link>}>
      <main style={{ padding: "40px 24px" }}>
        <h1 style={{ marginBottom: 8 }}>세션 목록</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          브라우저에 저장된 세션과 data/sessions 폴더의 파일을 합쳐서 보여 줍니다. 두 그룹을 나란히 비교할 때 쓰세요.
        </p>
        <Table<Session>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: "아직 세션이 없어요. 처음 화면에서 응시를 시작하세요." }}
          columns={[
            { title: "이름", dataIndex: "candidateName" },
            { title: "시작", dataIndex: "startedAt", render: (v: string) => new Date(v).toLocaleString("ko-KR") },
            { title: "단계", dataIndex: "phase", render: (p: Session["phase"]) => PHASE_LABEL[p] },
            { title: "질문 사용", render: (_, s) => `${s.clarify.qa.length}/${s.clarify.questionLimit}` },
            { title: "점수 초안", render: (_, s) => avgDraft(s) },
            { title: "확정 점수", render: (_, s) => avgFinal(s) },
            {
              title: "",
              render: (_, s) => (
                <Button size="small" onClick={() => open(s)}>
                  {s.phase === "done" ? "리포트 열기" : "이어서 진행"}
                </Button>
              ),
            },
          ]}
        />
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 16, fontSize: 13 }}>
          세션 id는 ULID입니다. 파일은 data/sessions/&lt;id&gt;.json 입니다.
        </Typography.Text>
      </main>
    </Shell>
  );
}
