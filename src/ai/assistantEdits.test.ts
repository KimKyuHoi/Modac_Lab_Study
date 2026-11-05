import { sanitizeEdits } from ".";
import { renderAiEdits } from "./prompts";
import { createSession, reduce } from "../session/reducer";

test("only keeps changed js/jsx/css files under /src and normalizes paths", () => {
  const files = { "/src/A.jsx": "same\n" };
  const out = sanitizeEdits(
    [
      { path: "src/A.jsx", content: "same" }, // 내용이 같다
      { path: "B.jsx", content: "new" }, // src/ 없이 와도 /src/로
      { path: "/src/../index.js", content: "x" }, // 경로 탈출
      { path: "/src/notes.md", content: "x" }, // 확장자
      { path: "/src/C.css", content: "a{}\n" },
    ],
    files,
  );
  expect(out).toEqual([
    { path: "/src/B.jsx", content: "new\n" },
    { path: "/src/C.css", content: "a{}\n" },
  ]);
});

test("evaluation sees whether the candidate changed what the assistant wrote", () => {
  const T = "2026-11-05T00:00:00.000Z";
  let s = createSession("a", T);
  s = reduce(s, { type: "chat/add", role: "user", text: "짜줘", at: T });
  s = reduce(s, {
    type: "chat/add",
    role: "model",
    text: "고쳤어요",
    at: T,
    edits: [
      { path: "/src/A.jsx", before: "old\n", after: "ai\n" },
      { path: "/src/B.jsx", before: null, after: "ai-b\n" },
      { path: "/src/C.jsx", before: "c\n", after: "ai-c\n" },
    ],
  });
  s = reduce(s, { type: "chat/revertEdit", chatId: "chat-2", path: "/src/C.jsx" });
  s = reduce(s, { type: "files/set", files: { "/src/A.jsx": "ai\n", "/src/B.jsx": "ai-b\nmine\n", "/src/C.jsx": "c\n" } });
  const text = renderAiEdits(s);
  expect(text).toContain("/src/A.jsx [chat-2]: 도우미가 쓴 그대로 제출");
  expect(text).toContain("/src/B.jsx [chat-2]: 도우미가 쓴 뒤 지원자가 직접 수정 +1 -0");
  expect(text).not.toContain("/src/C.jsx"); // 되돌린 변경은 빼고 본다
  expect(s.build.chat[1].edits?.find((e) => e.path === "/src/C.jsx")?.reverted).toBe(true);
});
