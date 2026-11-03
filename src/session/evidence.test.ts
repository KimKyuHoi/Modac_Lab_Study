import { createSession, reduce } from "./reducer";
import { filterExisting, listRefIds, parseRef, resolveRef } from "./evidence";

const T = "2026-11-04T00:00:00.000Z";

function fixture() {
  let s = createSession("a", T);
  s = reduce(s, { type: "qa/add", question: "몇 명이 쓰나요?", answer: "120만 명이요", at: T });
  s = reduce(s, { type: "spec/edit", text: "겹치면 등록일 늦은 쪽" });
  s = reduce(s, { type: "spec/lock", at: T });
  s = reduce(s, { type: "chat/add", role: "user", text: "필터 짜줘", at: T });
  const code = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`).join("\n");
  s = reduce(s, { type: "files/set", files: { "/src/App.jsx": code } });
  s = reduce(s, { type: "review/setItems", items: [{ id: "dq-1", kind: "design", question: "왜?", evidence: [] }] });
  return s;
}

test("parseRef parses code refs with path and line range", () => {
  expect(parseRef("code:src/App.jsx:40-52")).toEqual({ kind: "code", id: "code:src/App.jsx:40-52", path: "src/App.jsx", from: 40, to: 52 });
});

test("parseRef parses single-line code ref", () => {
  expect(parseRef("code:src/App.jsx:7")).toEqual({ kind: "code", id: "code:src/App.jsx:7", path: "src/App.jsx", from: 7, to: 7 });
});

test("parseRef parses qa, chat, dq, spec", () => {
  expect(parseRef("qa-3")).toEqual({ kind: "qa", id: "qa-3" });
  expect(parseRef("chat-12")).toEqual({ kind: "chat", id: "chat-12" });
  expect(parseRef("dq-2")).toEqual({ kind: "dq", id: "dq-2" });
  expect(parseRef("spec")).toEqual({ kind: "spec", id: "spec" });
  expect(parseRef("nonsense")).toBeNull();
});

test("resolveRef returns snippet lines 40-52 for a code ref", () => {
  const r = resolveRef(fixture(), "code:src/App.jsx:40-52");
  expect(r?.kind).toBe("code");
  if (r?.kind === "code") {
    expect(r.snippet.split("\n")[0]).toBe("line 40");
    expect(r.snippet.split("\n")).toHaveLength(13);
  }
});

test("resolveRef resolves qa, chat, spec, dq", () => {
  const s = fixture();
  expect(resolveRef(s, "qa-1")).toMatchObject({ kind: "qa", question: "몇 명이 쓰나요?" });
  expect(resolveRef(s, "chat-1")).toMatchObject({ kind: "chat", text: "필터 짜줘" });
  expect(resolveRef(s, "spec")).toMatchObject({ kind: "spec", text: "겹치면 등록일 늦은 쪽" });
  expect(resolveRef(s, "dq-1")).toMatchObject({ kind: "dq", question: "왜?" });
  expect(resolveRef(s, "qa-9")).toBeNull();
  expect(resolveRef(s, "code:src/Nope.jsx:1-2")).toBeNull();
});

test("filterExisting drops unknown refs and keeps order", () => {
  const s = fixture();
  expect(filterExisting(s, ["qa-1", "qa-7", "spec", "chat-3", "code:src/App.jsx:1-3", "code:src/App.jsx:999"])).toEqual([
    "qa-1",
    "spec",
    "code:src/App.jsx:1-3",
  ]);
});

test("listRefIds includes qa-*, chat-*, dq-* and file paths, and spec only when written", () => {
  const ids = listRefIds(fixture());
  expect(ids).toEqual(expect.arrayContaining(["spec", "qa-1", "chat-1", "dq-1"]));
  expect(listRefIds(createSession("b", T))).not.toContain("spec");
  expect(ids.some((i) => i.startsWith("code:src/App.jsx:"))).toBe(true);
});
