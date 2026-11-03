import { createSession } from "./reducer";
import { loadCurrent, loadLocal, saveLocal } from "./persist";

beforeEach(() => localStorage.clear());

test("restores current session from localStorage", () => {
  const s = createSession("김규회");
  saveLocal(s);
  expect(loadCurrent()?.id).toBe(s.id);
  expect(loadLocal(s.id)?.candidateName).toBe("김규회");
});

test("loadCurrent returns null when nothing saved or data is corrupt", () => {
  expect(loadCurrent()).toBeNull();
  localStorage.setItem("session:current", "zzz");
  localStorage.setItem("session:zzz", "{not json");
  expect(loadCurrent()).toBeNull();
});
