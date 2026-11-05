import { emptyPerf, gradeInput, isProbeMessage, reducePerf, summarize, toMetrics, type ProbeMessage } from "./metrics";

type Body = ProbeMessage extends infer M ? (M extends ProbeMessage ? Omit<M, "source"> : never) : never;
const msg = (m: Body) => ({ source: "perf-probe", ...m }) as ProbeMessage;

test("aggregates commits, long tasks (blocking = time over 50ms), inputs and API 429s", () => {
  let s = reducePerf(emptyPerf(), msg({ type: "boot" }));
  s = reducePerf(s, msg({ type: "commit", phase: "mount", ms: 120 }));
  s = reducePerf(s, msg({ type: "commit", phase: "update", ms: 8 }));
  s = reducePerf(s, msg({ type: "longtask", ms: 180 }));
  s = reducePerf(s, msg({ type: "longtask", ms: 70 }));
  s = reducePerf(s, msg({ type: "input", ms: 240, name: "keydown" }));
  s = reducePerf(s, msg({ type: "input", ms: 40, name: "click" }));
  s = reducePerf(s, msg({ type: "api", name: "searchVideos", status: 200 }));
  s = reducePerf(s, msg({ type: "api", name: "searchVideos", status: 429 }));
  expect(s).toMatchObject({ commits: 2, lastCommitMs: 8, maxCommitMs: 120, longTasks: 2, maxLongTaskMs: 180, blockingMs: 150, maxInputMs: 240, apiCalls: 2, api429: 1 });
  expect(s.recentCommits).toEqual([120, 8]);
});

test("a new preview boot resets the numbers but keeps the slowdown mode", () => {
  let s = { ...emptyPerf(4), commits: 9, blockingMs: 999 };
  s = reducePerf(s, msg({ type: "boot" }));
  expect(s).toMatchObject({ commits: 0, blockingMs: 0, slowdown: 4, booted: true });
});

test("only messages tagged by the probe are accepted", () => {
  expect(isProbeMessage({ source: "perf-probe", type: "boot" })).toBe(true);
  expect(isProbeMessage({ type: "boot" })).toBe(false);
  expect(isProbeMessage({ source: "sandpack", type: "boot" })).toBe(false);
});

test("metrics drop UI-only fields and summarize in one line", () => {
  const m = toMetrics({ ...emptyPerf(4), booted: true, recentCommits: [1, 2], apiCalls: 3, api429: 1 });
  expect("recentCommits" in m).toBe(false);
  expect(summarize(m)).toContain("API 3회(429 1회)");
  expect(summarize(m)).toContain("보급형 폰 모드 x4");
  expect(gradeInput(250)).toBe("warn");
});
