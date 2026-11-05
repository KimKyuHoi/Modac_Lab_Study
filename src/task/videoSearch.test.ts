// @vitest-environment node
import { transformSync } from "esbuild";
import { currentTask } from ".";
import { videoSearchTask } from "./videoSearch";

type Video = { id: number; title: string; series: string; category: string; publishedAt: string };
type VideosApi = {
  listAllVideos: () => Promise<Video[]>;
  searchVideos: (p?: { query?: string; category?: string; cursor?: string | null; limit?: number }) => Promise<{ items: Video[]; nextCursor: string | null; total: number }>;
};

/** 시작 코드의 가짜 API를 실제로 불러온다. import 할 때마다 새 모듈(요청 제한 카운터 초기화). */
let n = 0;
async function loadApi(): Promise<VideosApi> {
  const code = transformSync(videoSearchTask.starterFiles["/src/api/videos.js"], { loader: "js", format: "esm" }).code;
  return import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(`${code}\n// ${n++}`).toString("base64")}`);
}

test("the video search task is the current task", () => {
  expect(currentTask.id).toBe("video-search");
});

test("every starter file compiles as JSX", () => {
  for (const [path, code] of Object.entries(videoSearchTask.starterFiles)) {
    if (!/\.(jsx?|js)$/.test(path)) continue;
    expect(() => transformSync(code, { loader: "jsx" }), path).not.toThrow();
  }
});

test("editor opens a visible file and hides the template entry", () => {
  expect(videoSearchTask.visibleFiles).toContain(videoSearchTask.activeFile);
  expect(videoSearchTask.visibleFiles).not.toContain("/index.js");
  expect(videoSearchTask.visibleFiles).not.toContain("/perfProbe.js");
  expect(videoSearchTask.starterFiles["/index.js"]).toContain("<Profiler");
});

test("service profile exposes the conditions the frontend must design around", () => {
  const labels = videoSearchTask.serviceProfile.map((p) => p.label);
  expect(labels).toEqual(expect.arrayContaining(["월간 사용자", "트래픽", "기기", "API 제한", "모니터링", "콘텐츠 규모"]));
  expect(videoSearchTask.checklist).toHaveLength(5);
});

test("hidden facts do not repeat the public service specs", () => {
  const joined = videoSearchTask.facts.join("\n");
  expect(joined).not.toContain("120만");
  expect(joined).not.toContain("초당 5회");
});

test("fake API: search pages through results newest first with a cursor", async () => {
  const api = await loadApi();
  const first = await api.searchVideos({ category: "노래", limit: 20 });
  expect(first.items).toHaveLength(20);
  expect(first.items.every((v) => v.category === "노래")).toBe(true);
  expect(first.total).toBeGreaterThan(20);
  const second = await api.searchVideos({ category: "노래", cursor: first.nextCursor, limit: 20 });
  expect(second.items[0].id).not.toBe(first.items[0].id);
  const dates = [...first.items, ...second.items].map((v) => v.publishedAt);
  expect([...dates].sort().reverse()).toEqual(dates);
}, 10_000);

test("fake API: search matches title or series, case-insensitively", async () => {
  const api = await loadApi();
  const { items } = await api.searchVideos({ query: "baby shark" });
  expect(items.length).toBeGreaterThan(0);
  expect(items.every((v) => v.series === "Baby Shark Dance")).toBe(true);
}, 10_000);

test("fake API: more than 5 calls within a second is rejected with status 429", async () => {
  const api = await loadApi();
  const results = await Promise.allSettled(Array.from({ length: 7 }, () => api.searchVideos({ query: "a" })));
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
  expect(rejected).toHaveLength(2);
  expect(rejected[0].reason.status).toBe(429);
}, 10_000);
