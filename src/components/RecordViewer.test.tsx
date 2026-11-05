import { codeHighlights, refLabel, tabForRef } from "./RecordViewer";

test("collects highlighted lines per file from code refs, ignoring other refs", () => {
  const hl = codeHighlights(["code:src/VideoList.jsx:15-17", "qa-1", "code:/src/VideoList.jsx:53", "code:src/format.js:2-3"]);
  expect([...(hl.get("/src/VideoList.jsx") ?? [])]).toEqual([15, 16, 17, 53]);
  expect([...(hl.get("/src/format.js") ?? [])]).toEqual([2, 3]);
  expect(hl.size).toBe(2);
});

test("routes refs to tabs and gives readable labels", () => {
  expect(tabForRef("code:src/a.js:1-2")).toBe("code");
  expect(tabForRef("chat-3")).toBe("chat");
  expect(tabForRef("perf-1")).toBe("perf");
  expect(tabForRef("nope")).toBeNull();
  expect(refLabel("code:src/VideoList.jsx:15-22")).toBe("VideoList.jsx 15–22행");
  expect(refLabel("qa-3")).toBe("실무진 Q&A 3");
});
