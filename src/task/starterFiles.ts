// 지원자가 받는 시작 코드. Sandpack "react" 템플릿 위에 덮어쓴다.
export const starterFiles: Record<string, string> = {
  "/index.js": `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App";

createRoot(document.getElementById("root")).render(<App />);
`,
  "/src/App.jsx": `import { useState } from "react";
import Home from "./Home";
import Admin from "./Admin";
import "./styles.css";

export default function App() {
  const [tab, setTab] = useState("home");
  return (
    <div className="app">
      <nav className="nav">
        <button className={tab === "home" ? "on" : ""} onClick={() => setTab("home")}>홈</button>
        <button className={tab === "admin" ? "on" : ""} onClick={() => setTab("admin")}>배너 관리</button>
      </nav>
      {tab === "home" ? <Home /> : <Admin />}
    </div>
  );
}
`,
  "/src/Home.jsx": `import { useEffect, useState } from "react";
import { listBanners } from "./api/banners";
import { getUserCountry } from "./user";

// 홈 상단 한 자리에 배너 하나를 보여 준다.
export default function Home() {
  const [banners, setBanners] = useState([]);
  const country = getUserCountry();

  useEffect(() => {
    listBanners().then(setBanners);
  }, []);

  const banner = banners[0];

  return (
    <section className="home">
      <div className="slot">
        {banner ? (
          <img src={banner.imageUrl} alt={banner.title} />
        ) : (
          <div className="empty">배너 없음</div>
        )}
      </div>
      <p className="hint">현재 사용자 국가: {country}</p>
      <h2>오늘의 콘텐츠</h2>
      <ul className="grid">
        <li>상어 가족 춤</li>
        <li>알파벳 노래</li>
        <li>공룡 탐험</li>
        <li>동물 친구들</li>
      </ul>
    </section>
  );
}
`,
  "/src/Admin.jsx": `import { useEffect, useState } from "react";
import { listBanners, createBanner, updateBanner } from "./api/banners";

// 운영자가 배너를 등록·수정하는 화면
export default function Admin() {
  const [banners, setBanners] = useState([]);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const reload = () => listBanners().then(setBanners);
  useEffect(() => { reload(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    await createBanner({ title, imageUrl });
    setTitle("");
    setImageUrl("");
    reload();
  };

  const rename = async (b) => {
    const next = window.prompt("새 제목", b.title);
    if (next == null) return;
    await updateBanner(b.id, { title: next });
    reload();
  };

  return (
    <section className="admin">
      <h2>배너 관리</h2>
      <form onSubmit={onSubmit} className="form">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" required />
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="이미지 URL" required />
        <button type="submit">등록</button>
      </form>
      <table>
        <thead>
          <tr><th>제목</th><th>이미지</th><th>등록일</th><th></th></tr>
        </thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.id}>
              <td>{b.title}</td>
              <td className="url">{b.imageUrl}</td>
              <td>{new Date(b.createdAt).toLocaleString()}</td>
              <td><button onClick={() => rename(b)}>제목 수정</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
`,
  "/src/api/banners.js": `// 가짜 API. 메모리 배열을 쓰고 300ms 지연이 있다.
// 실제 서비스에서는 REST API(/api/banners)를 호출한다.
let seq = 3;
let banners = [
  { id: 1, title: "여름 특집", imageUrl: "https://placehold.co/960x240/F23D97/fff?text=Summer", createdAt: "2026-06-01T09:00:00+09:00" },
  { id: 2, title: "신규 가입 혜택", imageUrl: "https://placehold.co/960x240/16202B/fff?text=Welcome", createdAt: "2026-07-15T09:00:00+09:00" },
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function listBanners() {
  await delay(300);
  return banners.map((b) => ({ ...b }));
}

export async function createBanner(input) {
  await delay(300);
  const banner = { id: seq++, createdAt: new Date().toISOString(), ...input };
  banners = [...banners, banner];
  return { ...banner };
}

export async function updateBanner(id, patch) {
  await delay(300);
  banners = banners.map((b) => (b.id === id ? { ...b, ...patch } : b));
  return banners.find((b) => b.id === id);
}
`,
  "/src/user.js": `// 로그인 사용자의 설정 국가. 비로그인은 브라우저 언어로 추정한다.
export function getUserCountry() {
  return "KR";
}

export function getNow() {
  return new Date();
}
`,
  "/src/styles.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #16202b; }
.app { max-width: 960px; margin: 0 auto; padding: 16px; }
.nav { display: flex; gap: 8px; margin-bottom: 16px; }
.nav button { padding: 6px 12px; border: 1px solid #d9dee5; background: #fff; cursor: pointer; }
.nav button.on { background: #16202b; color: #fff; border-color: #16202b; }
.slot { height: 160px; background: #f2f4f7; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.slot img { width: 100%; height: 100%; object-fit: cover; }
.empty { color: #5b6673; }
.hint { color: #5b6673; font-size: 13px; }
.grid { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.grid li { background: #f2f4f7; padding: 24px 8px; text-align: center; }
.form { display: flex; gap: 8px; margin-bottom: 16px; }
.form input { flex: 1; padding: 6px 8px; border: 1px solid #d9dee5; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #d9dee5; }
.url { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`,
};

/** 에디터에 보여 줄 파일. Sandpack 템플릿 기본 파일과 진입 파일은 숨긴다. */
export const visibleStarterFiles = Object.keys(starterFiles).filter((p) => p.startsWith("/src/"));
