// 지원자가 받는 시작 코드. Sandpack "react" 템플릿 위에 덮어쓴다.
// 일부러 느리다: 전체 5,000개를 한 번에 받아 모두 그리고, 카드마다 썸네일 디코딩 비용이 든다.
// 최적화하지 않고 검색만 붙이면 첫 화면과 타이핑이 눈에 띄게 버벅인다.
export const videoSearchStarterFiles: Record<string, string> = {
  // 진입 파일과 perfProbe.js는 응시자에게 보이지 않는다. 성능 패널로 측정값을 보낸다.
  "/index.js": `import React, { Profiler } from "react";
import { createRoot } from "react-dom/client";
import { onRender, startProbe } from "./perfProbe";
import App from "./src/App";

startProbe();
createRoot(document.getElementById("root")).render(
  <Profiler id="App" onRender={onRender}>
    <App />
  </Profiler>,
);
`,
  "/perfProbe.js": `const post = (m) => {
  try {
    window.parent.postMessage({ source: "perf-probe", ...m }, "*");
  } catch (e) {}
};

export function onRender(_id, phase, actualDuration) {
  post({ type: "commit", phase, ms: actualDuration });
}

function observe(type, cb, extra) {
  try {
    new PerformanceObserver((list) => list.getEntries().forEach(cb)).observe({ type, buffered: true, ...extra });
  } catch (e) {}
}

export function startProbe() {
  globalThis.__cpuSlowdown = 1;
  globalThis.__perfApi = (name, status) => post({ type: "api", name, status });
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.source !== "perf-host") return;
    if (d.type === "slowdown") globalThis.__cpuSlowdown = Number(d.factor) || 1;
    if (d.type === "reload") location.reload();
  });
  post({ type: "boot" });
  observe("longtask", (e) => post({ type: "longtask", ms: e.duration }));
  observe("event", (e) => { if (e.interactionId) post({ type: "input", ms: e.duration, name: e.name }); }, { durationThreshold: 16 });
  observe("largest-contentful-paint", (e) => post({ type: "lcp", ms: e.startTime }));
  setInterval(() => post({ type: "dom", nodes: document.getElementsByTagName("*").length }), 1000);
}
`,
  "/src/App.jsx": `import VideoList from "./VideoList";
import "./styles.css";

export default function App() {
  return (
    <div className="app">
      <header className="top">
        <strong>키즈 영상</strong>
        <span className="sub">전체 영상</span>
      </header>
      <VideoList />
    </div>
  );
}
`,
  "/src/VideoList.jsx": `import { useEffect, useState } from "react";
import { listAllVideos } from "./api/videos";
import VideoCard from "./VideoCard";

// 전체 영상 페이지. 지금은 모든 영상을 한 번에 받아 전부 그린다.
export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllVideos().then((list) => {
      setVideos(list);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="state">불러오는 중…</p>;

  return (
    <section>
      <p className="count">영상 {videos.length.toLocaleString()}개</p>
      <ul className="grid">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </ul>
    </section>
  );
}
`,
  "/src/VideoCard.jsx": `import { decodeThumbnail } from "./thumbnail";
import { formatDuration, formatDate } from "./format";

export default function VideoCard({ video }) {
  const thumb = decodeThumbnail(video);
  return (
    <li className="card">
      <div className="thumb" style={{ background: thumb.background }}>
        <span className="dur">{formatDuration(video.durationSec)}</span>
      </div>
      <div className="meta">
        <div className="title">{video.title}</div>
        <div className="sub">
          {video.series} · {video.category} · {formatDate(video.publishedAt, video.country)}
        </div>
      </div>
    </li>
  );
}
`,
  "/src/thumbnail.js": `// 썸네일 이미지를 디코딩하는 비용을 흉내 낸다.
// 실서비스에서는 카드 한 장마다 이미지 요청과 디코딩이 일어나고, 보급형 폰에서는 이보다 느리다.
// 이 파일의 비용 자체는 바꾸지 말고, 언제 몇 장을 그릴지로 풀어 주세요.
// 성능 패널의 '보급형 폰' 모드를 켜면 비용이 배수만큼 커진다.
export function decodeThumbnail(video) {
  const end = performance.now() + 0.3 * (globalThis.__cpuSlowdown ?? 1);
  let h = video.id;
  while (performance.now() < end) h = (h * 31 + 7) % 360;
  const hue = (video.id * 47) % 360;
  return { background: \`linear-gradient(135deg, hsl(\${hue} 70% 62%), hsl(\${(hue + 40) % 360} 70% 48%))\` };
}
`,
  "/src/format.js": `export function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return \`\${m}:\${s}\`;
}

const LOCALE = { KR: "ko-KR", JP: "ja-JP", US: "en-US" };

export function formatDate(iso, country) {
  return new Intl.DateTimeFormat(LOCALE[country] ?? "ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));
}
`,
  "/src/api/videos.js": `// 가짜 API. 실서비스의 REST API(/api/videos, /api/videos/search)와 같은 모양과 제한을 흉내 낸다.
//
// - 클라이언트당 초당 5회를 넘으면 429 에러를 던진다 (API 게이트웨이 제한, 피크 때 서버 보호용).
// - 응답 시간은 매번 다르다. 먼저 보낸 요청이 나중에 도착할 수 있다.

const CATEGORIES = ["노래", "동화", "학습", "놀이", "춤"];
const SERIES = [
  ["상어 가족", "KR"], ["동물 친구들", "KR"], ["공룡 탐험대", "KR"], ["알파벳 노래", "KR"], ["숫자 놀이", "KR"],
  ["잠자리 동화", "KR"], ["색깔 놀이", "KR"], ["탈것 친구들", "KR"], ["우리 몸 이야기", "KR"], ["사계절 노래", "KR"],
  ["きょうりゅう探検", "JP"], ["どうぶつのうた", "JP"], ["おやすみ絵本", "JP"], ["かずあそび", "JP"], ["のりものずかん", "JP"],
  ["Baby Shark Dance", "US"], ["ABC Phonics", "US"], ["Counting Fun", "US"], ["Bedtime Stories", "US"], ["Wheels on the Bus", "US"],
];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261105);
const ALL = Array.from({ length: 5000 }, (_, i) => {
  const [series, country] = SERIES[Math.floor(rand() * SERIES.length)];
  const ep = 1 + Math.floor(rand() * 120);
  const title = country === "JP" ? \`\${series} 第\${ep}話\` : country === "US" ? \`\${series} Ep.\${ep}\` : \`\${series} \${ep}화\`;
  const published = new Date(Date.UTC(2019, 0, 1) + Math.floor(rand() * 2500) * 86400000);
  return {
    id: i + 1,
    title,
    series,
    country,
    category: CATEGORIES[Math.floor(rand() * CATEGORIES.length)],
    durationSec: 60 + Math.floor(rand() * 600),
    publishedAt: published.toISOString(),
  };
}).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let calls = [];
function rateLimit(name) {
  const now = Date.now();
  calls = calls.filter((t) => now - t < 1000);
  calls.push(now);
  const limited = calls.length > 5;
  globalThis.__perfApi?.(name, limited ? 429 : 200); // 성능 패널 집계용
  if (limited) {
    const err = new Error("429 Too Many Requests: 초당 5회를 넘었어요.");
    err.status = 429;
    throw err;
  }
}

/** 전체 영상을 한 번에 받는다. 응답이 크고 느리다(실서비스 기준 약 4MB). */
export async function listAllVideos() {
  rateLimit("listAllVideos");
  await delay(1500 + Math.random() * 1000);
  return ALL.map((v) => ({ ...v }));
}

/**
 * 서버 검색. 제목과 시리즈 이름에서 찾고, 최신순으로 limit개씩 돌려준다.
 * @param {{ query?: string, category?: string, cursor?: string | null, limit?: number }} params
 * @returns {Promise<{ items: object[], nextCursor: string | null, total: number }>}
 */
export async function searchVideos({ query = "", category = "", cursor = null, limit = 20 } = {}) {
  rateLimit("searchVideos");
  await delay(150 + Math.random() * 750);
  const q = query.trim().toLowerCase();
  const matched = ALL.filter(
    (v) =>
      (!category || v.category === category) &&
      (!q || v.title.toLowerCase().includes(q) || v.series.toLowerCase().includes(q)),
  );
  const start = cursor ? Number(cursor) : 0;
  const size = Math.min(Math.max(1, limit), 50);
  const items = matched.slice(start, start + size).map((v) => ({ ...v }));
  const next = start + size < matched.length ? String(start + size) : null;
  return { items, nextCursor: next, total: matched.length };
}

export { CATEGORIES };
`,
  "/src/styles.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #16202b; background: #fff; }
.app { max-width: 960px; margin: 0 auto; padding: 12px; }
.top { display: flex; align-items: baseline; gap: 8px; padding: 8px 0 12px; }
.top .sub { color: #5b6673; font-size: 14px; }
.state, .count { color: #5b6673; font-size: 14px; }
.grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.card { display: flex; flex-direction: column; gap: 6px; }
.thumb { position: relative; aspect-ratio: 16 / 9; border-radius: 8px; }
.dur { position: absolute; right: 6px; bottom: 6px; background: rgba(0, 0, 0, 0.7); color: #fff; font-size: 11px; padding: 1px 4px; border-radius: 3px; }
.title { font-size: 14px; font-weight: 600; line-height: 1.35; }
.meta .sub { color: #5b6673; font-size: 12px; }
`,
};

export const videoSearchVisibleFiles = Object.keys(videoSearchStarterFiles).filter((p) => p.startsWith("/src/"));
