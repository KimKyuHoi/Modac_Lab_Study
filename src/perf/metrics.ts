/**
 * 미리보기 iframe 안의 perfProbe.js가 postMessage로 보내는 측정값을 모은다.
 * 미리보기가 새로 뜨면(코드 수정 후 재컴파일, 새로고침) "boot"가 오고 수치를 처음부터 다시 잰다.
 */
export const PROBE_SOURCE = "perf-probe";
export const HOST_SOURCE = "perf-host";

export type ProbeMessage =
  | { source: typeof PROBE_SOURCE; type: "boot" }
  | { source: typeof PROBE_SOURCE; type: "commit"; phase: string; ms: number }
  | { source: typeof PROBE_SOURCE; type: "longtask"; ms: number }
  | { source: typeof PROBE_SOURCE; type: "input"; ms: number; name: string }
  | { source: typeof PROBE_SOURCE; type: "lcp"; ms: number }
  | { source: typeof PROBE_SOURCE; type: "dom"; nodes: number }
  | { source: typeof PROBE_SOURCE; type: "api"; name: string; status: number };

export type PerfMetrics = {
  /** React Profiler 커밋 횟수와 시간(ms) */
  commits: number;
  lastCommitMs: number;
  maxCommitMs: number;
  /** 50ms 넘게 메인 스레드를 막은 작업 */
  longTasks: number;
  maxLongTaskMs: number;
  /** 긴 작업마다 50ms를 넘은 부분의 합 (TBT와 같은 계산) */
  blockingMs: number;
  /** 클릭·입력에 화면이 반응하기까지 걸린 가장 긴 시간 (INP 근사) */
  maxInputMs: number;
  lcpMs: number | null;
  domNodes: number;
  apiCalls: number;
  api429: number;
  /** 보급형 폰 모드 배수. 1이면 끔 */
  slowdown: number;
};

export type PerfState = PerfMetrics & {
  /** 최근 커밋 시간들. 막대그래프용 */
  recentCommits: number[];
  booted: boolean;
  /** 마지막으로 미리보기가 새로 뜬 시각(Date.now). 제출 직전 재측정이 끝났는지 볼 때 쓴다 */
  bootedAt: number | null;
};

const RECENT = 40;

export function emptyPerf(slowdown = 1): PerfState {
  return {
    commits: 0,
    lastCommitMs: 0,
    maxCommitMs: 0,
    longTasks: 0,
    maxLongTaskMs: 0,
    blockingMs: 0,
    maxInputMs: 0,
    lcpMs: null,
    domNodes: 0,
    apiCalls: 0,
    api429: 0,
    slowdown,
    recentCommits: [],
    booted: false,
    bootedAt: null,
  };
}

export function isProbeMessage(data: unknown): data is ProbeMessage {
  return typeof data === "object" && data !== null && (data as { source?: unknown }).source === PROBE_SOURCE && typeof (data as { type?: unknown }).type === "string";
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function reducePerf(s: PerfState, m: ProbeMessage): PerfState {
  switch (m.type) {
    case "boot":
      return { ...emptyPerf(s.slowdown), booted: true, bootedAt: Date.now() };
    case "commit": {
      const ms = num(m.ms);
      return { ...s, commits: s.commits + 1, lastCommitMs: ms, maxCommitMs: Math.max(s.maxCommitMs, ms), recentCommits: [...s.recentCommits, ms].slice(-RECENT) };
    }
    case "longtask": {
      const ms = num(m.ms);
      return { ...s, longTasks: s.longTasks + 1, maxLongTaskMs: Math.max(s.maxLongTaskMs, ms), blockingMs: s.blockingMs + Math.max(0, ms - 50) };
    }
    case "input":
      return { ...s, maxInputMs: Math.max(s.maxInputMs, num(m.ms)) };
    case "lcp":
      return { ...s, lcpMs: num(m.ms) };
    case "dom":
      return { ...s, domNodes: num(m.nodes) };
    case "api":
      return { ...s, apiCalls: s.apiCalls + 1, api429: s.api429 + (m.status === 429 ? 1 : 0) };
  }
}

export function toMetrics(s: PerfState): PerfMetrics {
  const { recentCommits: _r, booted: _b, bootedAt: _t, ...metrics } = s;
  return metrics;
}

/** 서비스 모니터링 알림 기준(LCP 2.5초, INP 200ms)과 같은 선으로 색을 나눈다. */
export type Grade = "good" | "warn" | "bad";
export function gradeInput(ms: number): Grade {
  return ms <= 200 ? "good" : ms <= 500 ? "warn" : "bad";
}
export function gradeLcp(ms: number | null): Grade {
  if (ms === null) return "good";
  return ms <= 2500 ? "good" : ms <= 4000 ? "warn" : "bad";
}
export function gradeBlocking(ms: number): Grade {
  return ms <= 200 ? "good" : ms <= 600 ? "warn" : "bad";
}

export function summarize(m: PerfMetrics): string {
  return [
    `렌더 ${m.commits}회(최대 ${Math.round(m.maxCommitMs)}ms)`,
    `긴 작업 ${m.longTasks}회(차단 합계 ${Math.round(m.blockingMs)}ms, 최대 ${Math.round(m.maxLongTaskMs)}ms)`,
    `입력 반응 최대 ${Math.round(m.maxInputMs)}ms`,
    `LCP ${m.lcpMs === null ? "측정 전" : `${Math.round(m.lcpMs)}ms`}`,
    `DOM 노드 ${m.domNodes}`,
    `API ${m.apiCalls}회(429 ${m.api429}회)`,
    m.slowdown > 1 ? `보급형 폰 모드 x${m.slowdown}` : "일반 속도",
  ].join(", ");
}
