import { gradeBlocking, gradeInput, gradeLcp, type Grade, type PerfState } from "../perf/metrics";

const GRADE_COLOR: Record<Grade, string> = { good: "#4ec9b0", warn: "#dcdcaa", bad: "#f48771" };
const ms = (v: number) => `${Math.round(v).toLocaleString()}ms`;

function Metric({ label, value, grade, hint }: { label: string; value: string; grade?: Grade; hint: string }) {
  return (
    <div title={hint} style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--chrome-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: grade ? GRADE_COLOR[grade] : "var(--chrome-text)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

/** 미리보기 아래 성능 패널. 측정값은 미리보기가 새로 뜰 때마다 처음부터 다시 잰다. */
export function PerfPanel({ perf, onSlowdown, onRecord, onRemeasure, recordCount }: { perf: PerfState; onSlowdown: (factor: number) => void; onRecord: () => void; onRemeasure: () => void; recordCount: number }) {
  const peak = Math.max(16, ...perf.recentCommits);
  return (
    <section aria-label="성능 패널" style={{ background: "#181818", color: "var(--chrome-text)", borderTop: "1px solid var(--chrome-line)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <strong style={{ fontSize: 12, whiteSpace: "nowrap" }} title="코드를 고친 뒤에는 '새로 재기'를 눌러야 고친 코드로 처음부터 다시 재요">
          성능
        </strong>
        {!perf.booted && <span style={{ color: "var(--chrome-muted)", whiteSpace: "nowrap" }}>대기 중</span>}
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" }} title="썸네일 디코딩 같은 무거운 작업을 4배 느리게 만들어 보급형 안드로이드를 흉내 내요">
          <input type="checkbox" checked={perf.slowdown > 1} onChange={(e) => onSlowdown(e.target.checked ? 4 : 1)} />
          보급형 폰
        </label>
        <button
          type="button"
          onClick={onRemeasure}
          title="미리보기를 새로고침하고 처음부터 다시 재요"
          style={{ background: "transparent", color: "var(--chrome-text)", border: "1px solid #3c3c3c", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          새로 재기
        </button>
        <button
          type="button"
          onClick={onRecord}
          disabled={!perf.booted}
          style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 4, padding: "3px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", cursor: perf.booted ? "pointer" : "default", opacity: perf.booted ? 1 : 0.5 }}
        >
          수치 기록{recordCount > 0 ? ` ${recordCount}` : ""}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px 12px" }}>
        <Metric label="차단 시간" value={ms(perf.blockingMs)} grade={gradeBlocking(perf.blockingMs)} hint={`50ms 넘는 긴 작업 ${perf.longTasks}회, 가장 긴 것 ${ms(perf.maxLongTaskMs)}. 이 동안 화면이 입력에 반응하지 못해요.`} />
        <Metric label="입력 반응" value={ms(perf.maxInputMs)} grade={gradeInput(perf.maxInputMs)} hint="클릭·타이핑 뒤 화면이 바뀌기까지 걸린 가장 긴 시간(INP 근사). 서비스 알림 기준 200ms." />
        <Metric label="LCP" value={perf.lcpMs === null ? "—" : ms(perf.lcpMs)} grade={gradeLcp(perf.lcpMs)} hint="가장 큰 콘텐츠가 그려진 시각. 서비스 알림 기준 2.5초." />
        <Metric label="렌더 (최대)" value={ms(perf.maxCommitMs)} hint={`React Profiler 기준 커밋 ${perf.commits}회, 마지막 ${ms(perf.lastCommitMs)}`} />
        <Metric label="DOM 노드" value={perf.domNodes.toLocaleString()} hint="미리보기 문서의 요소 수. 많을수록 레이아웃과 메모리 비용이 커요." />
        <Metric label="API / 429" value={`${perf.apiCalls} / ${perf.api429}`} grade={perf.api429 > 0 ? "bad" : undefined} hint="가짜 API 호출 수와 초당 5회 제한에 걸린 횟수" />
      </div>
      <div aria-hidden style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 28 }} title="최근 렌더 시간">
        {perf.recentCommits.map((v, i) => (
          <span key={i} style={{ flex: 1, maxWidth: 8, height: `${Math.max(6, (v / peak) * 100)}%`, background: v > 50 ? GRADE_COLOR.bad : v > 16 ? GRADE_COLOR.warn : GRADE_COLOR.good, borderRadius: 1 }} />
        ))}
      </div>
    </section>
  );
}
