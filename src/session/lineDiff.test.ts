import { diffText, hunks, lineDiff } from "./lineDiff";

test("counts added and removed lines and keeps unchanged ones as context", () => {
  const d = lineDiff("a\nb\nc", "a\nB\nc\nd");
  expect(d).toMatchObject({ added: 2, removed: 1 });
  expect(d.lines.map((l) => `${l.type}:${l.text}`)).toEqual(["ctx:a", "del:b", "add:B", "ctx:c", "add:d"]);
});

test("a new file is all additions", () => {
  expect(lineDiff(null, "x\ny")).toMatchObject({ added: 2, removed: 0 });
});

test("hunks keep only lines near changes and mark the gaps", () => {
  const before = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
  const after = before.replace("l10", "L10");
  const h = hunks(lineDiff(before, after), 1);
  expect(h.map((l) => (l ? l.text : "…"))).toEqual(["l9", "l10", "L10", "l11"]);
  expect(diffText(lineDiff(before, after))).toContain("- l10\n+ L10");
});
