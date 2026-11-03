import { App as AntApp, Button, Input } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EvidenceChip } from "../components/EvidenceChip";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { ScoreRow } from "../components/ScoreRow";
import { Shell } from "../components/Shell";
import { listFiles, loadLocal } from "../session/persist";
import { useSession } from "../session/store";
import { COMPETENCY_LABELS, type Session } from "../session/types";

function download(s: Session) {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `session-${s.candidateName}-${s.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportPage() {
  const { id = "" } = useParams();
  const { session, load, dispatch, persistFile } = useSession();
  const { message } = AntApp.useApp();
  const [missing, setMissing] = useState(false);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [finals, setFinals] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const s = session && session.id === id ? session : null;

  useEffect(() => {
    if (s) {
      setFinals(s.report?.interviewer?.finalScores ?? Object.fromEntries((s.report?.competencies ?? []).map((c) => [c.key, c.draftScore])));
      setNotes(s.report?.interviewer?.notes ?? "");
      return;
    }
    const local = loadLocal(id);
    if (local) {
      load(local);
      return;
    }
    listFiles().then((all) => {
      const found = all.find((x) => x.id === id);
      if (found) load(found);
      else setMissing(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, s?.id]);

  if (missing) {
    return (
      <Shell right={<Link to="/sessions">세션 목록</Link>}>
        <main style={{ padding: 40 }}>
          <h1>세션을 찾을 수 없어요</h1>
          <p className="muted" style={{ marginTop: 8 }}>브라우저 저장소와 data/sessions 폴더 어디에도 이 id가 없어요.</p>
        </main>
      </Shell>
    );
  }
  if (!s) {
    return (
      <Shell>
        <main style={{ padding: 40 }} className="muted">불러오는 중</main>
      </Shell>
    );
  }
  if (!s.report) {
    return (
      <Shell right={<Link to="/sessions">세션 목록</Link>}>
        <main style={{ padding: 40 }}>
          <h1>아직 리포트가 없어요</h1>
          <p className="muted" style={{ marginTop: 8 }}>이 세션은 설계 질의를 끝내지 않았어요. 세션 목록에서 이어서 진행할 수 있어요.</p>
        </main>
      </Shell>
    );
  }

  const r = s.report;
  const locked = !!r.interviewer;
  const passed = r.checklist.filter((c) => c.passed).length;

  const confirm = async () => {
    dispatch({ type: "report/confirm", finalScores: finals, notes, at: new Date().toISOString() });
    try {
      await persistFile();
      message.success("점수를 확정했어요.");
    } catch {
      message.warning("확정은 됐지만 파일 저장에 실패했어요. 브라우저에는 저장됐어요.");
    }
  };

  return (
    <Shell step={3} right={<Link to="/sessions">세션 목록</Link>}>
      <main style={{ padding: "40px 24px 100px", maxWidth: 980 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 6 }}>
          <h1>{s.candidateName}</h1>
          <span className="muted">{new Date(s.startedAt).toLocaleString("ko-KR")} 시작</span>
        </div>
        <p className="muted" style={{ marginBottom: 36 }}>
          실무진 질문 {s.clarify.qa.length}/{s.clarify.questionLimit}회, 도우미 대화 {s.build.chat.filter((c) => c.role === "user").length}회, 체크리스트 {passed}/{r.checklist.length} 통과. 점수는 초안이고 대괄호 안이 근거입니다. 눌러서 원문을 확인하세요.
        </p>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ marginBottom: 4 }}>역량별 점수</h2>
          <div style={{ borderTop: "1px solid var(--line)" }}>
            {r.competencies.map((c) => (
              <ScoreRow
                key={c.key}
                label={COMPETENCY_LABELS[c.key]}
                draftScore={c.draftScore}
                rationale={c.rationale}
                evidence={c.evidence}
                session={s}
                final={finals[c.key]}
                onFinalChange={(v) => setFinals((f) => ({ ...f, [c.key]: v }))}
                onOpen={setOpenRef}
                locked={locked}
              />
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ marginBottom: 12 }}>코드 점검</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {r.checklist.map((c, i) => (
              <li key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontWeight: 700, color: c.passed ? "var(--moss)" : "var(--pink)" }}>{c.passed ? "통과" : "미흡"}</span>
                <span>
                  {c.item}{" "}
                  {c.evidence.map((e) => (
                    <EvidenceChip key={e} refId={e} onOpen={setOpenRef} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ marginBottom: 12 }}>면접에서 물어볼 것</h2>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {r.interviewQuestions.map((q, i) => (
              <li key={i} style={{ marginBottom: 8, maxWidth: "70ch" }}>
                {q}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 style={{ marginBottom: 12 }}>면접관 메모와 확정</h2>
          <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} autoSize={{ minRows: 4 }} disabled={locked} placeholder="리포트와 다르게 본 점, 면접에서 확인할 점" aria-label="면접관 메모" />
          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
            <Button type="primary" onClick={confirm} disabled={locked || Object.keys(finals).length < r.competencies.length}>
              점수 확정
            </Button>
            <Button onClick={() => download(s)}>JSON 다운로드</Button>
            {locked && <span className="muted">{new Date(r.interviewer!.confirmedAt).toLocaleString("ko-KR")} 확정됨</span>}
          </div>
        </section>
      </main>
      <EvidenceDrawer session={s} refId={openRef} onClose={() => setOpenRef(null)} />
    </Shell>
  );
}
