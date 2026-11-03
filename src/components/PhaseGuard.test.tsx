import { createSession, reduce } from "../session/reducer";
import { routeForPhase } from "./PhaseGuard";

const T = "2026-11-04T00:00:00.000Z";

test("clarify and build phases both route to the single /work screen", () => {
  let s = createSession("a", T);
  expect(routeForPhase(s)).toBe("/work");
  s = reduce(s, { type: "spec/lock", at: T });
  expect(routeForPhase(s)).toBe("/work");
  s = reduce(s, { type: "build/submit", at: T });
  expect(routeForPhase(s)).toBe("/review");
});
