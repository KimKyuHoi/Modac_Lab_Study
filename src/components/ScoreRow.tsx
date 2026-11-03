import { Select } from "antd";
import type { Session } from "../session/types";
import { EvidenceChip } from "./EvidenceChip";
import { EvidenceText } from "./EvidenceText";

type Props = {
  label: string;
  draftScore: number;
  rationale: string;
  evidence: string[];
  session: Session;
  final?: number;
  onFinalChange: (v: number) => void;
  onOpen: (ref: string) => void;
  locked: boolean;
};

function Segments({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }} aria-label={`점수 초안 ${score}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ width: 18, height: 8, background: n <= score ? "var(--ink)" : "var(--line)" }} />
      ))}
    </div>
  );
}

export function ScoreRow({ label, draftScore, rationale, evidence, session, final, onFinalChange, onOpen, locked }: Props) {
  const noEvidence = evidence.length === 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 120px", gap: 20, padding: "18px 0", borderBottom: "1px solid var(--line)", alignItems: "start" }}>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{label}</div>
        {noEvidence ? <span style={{ color: "var(--pink)", fontSize: 13 }}>근거 부족</span> : <Segments score={draftScore} />}
      </div>
      <div style={{ fontSize: 14.5 }}>
        {noEvidence ? (
          <span className="muted">점수를 뒷받침하는 기록이 없어 초안을 표시하지 않아요. 면접에서 직접 확인하세요.</span>
        ) : (
          <>
            <EvidenceText text={rationale} session={session} onOpen={onOpen} />
            <div style={{ marginTop: 6 }}>
              {evidence.map((r) => (
                <EvidenceChip key={r} refId={r} onOpen={onOpen} />
              ))}
            </div>
          </>
        )}
      </div>
      <div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
          확정 점수
        </div>
        <Select
          value={final}
          onChange={onFinalChange}
          disabled={locked}
          placeholder="선택"
          style={{ width: "100%" }}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}점` }))}
          aria-label={`${label} 확정 점수`}
        />
      </div>
    </div>
  );
}
