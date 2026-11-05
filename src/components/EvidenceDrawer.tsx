import { Drawer } from "antd";
import { summarize } from "../perf/metrics";
import { resolveRef } from "../session/evidence";
import type { Session } from "../session/types";

const TITLE = { qa: "실무진 Q&A", chat: "AI 도우미 대화", spec: "해결책 정의서", dq: "설계 질의", code: "제출 코드", perf: "성능 측정" } as const;

export function EvidenceDrawer({ session, refId, onClose }: { session: Session; refId: string | null; onClose: () => void }) {
  const ev = refId ? resolveRef(session, refId) : null;
  return (
    <Drawer open={!!refId} onClose={onClose} width={560} title={ev ? `${TITLE[ev.kind]} · ${ev.id}` : "근거"} styles={{ body: { padding: 24 } }}>
      {!ev && <p className="muted">이 근거는 기록에서 찾을 수 없어요.</p>}
      {ev?.kind === "qa" && (
        <>
          <div className="muted" style={{ fontSize: 13 }}>지원자가 물음</div>
          <p style={{ fontWeight: 600, marginBottom: 16 }}>{ev.question}</p>
          <div className="muted" style={{ fontSize: 13 }}>실무진 답</div>
          <p className="prose">{ev.answer}</p>
        </>
      )}
      {ev?.kind === "chat" && (
        <>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{ev.role === "user" ? "지원자" : "도우미"}</div>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.65 }}>{ev.text}</pre>
        </>
      )}
      {ev?.kind === "spec" && <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.65 }}>{ev.text}</pre>}
      {ev?.kind === "dq" && (
        <>
          <p style={{ fontWeight: 600, marginBottom: 12 }}>{ev.question}</p>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.65 }}>{ev.answer ?? "(무응답)"}</pre>
        </>
      )}
      {ev?.kind === "perf" && (
        <>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            {ev.label} · {new Date(ev.at).toLocaleTimeString()}
          </div>
          <p className="prose">{summarize(ev.metrics)}</p>
        </>
      )}
      {ev?.kind === "code" && (
        <>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            {ev.path} {ev.from}{ev.to !== ev.from ? `–${ev.to}` : ""}행
          </div>
          <pre style={{ margin: 0, background: "var(--frost)", padding: 12, borderRadius: 4, fontSize: 13, lineHeight: 1.55, overflowX: "auto" }}>
            {ev.snippet.split("\n").map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--muted)", minWidth: 36, textAlign: "right", userSelect: "none" }}>{ev.from + i}</span>
                <span>{line || " "}</span>
              </div>
            ))}
          </pre>
        </>
      )}
    </Drawer>
  );
}
