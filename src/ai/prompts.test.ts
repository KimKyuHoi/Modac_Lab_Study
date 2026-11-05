import { bannerScheduleTask } from "../task/bannerSchedule";
import { createSession, reduce } from "../session/reducer";
import { assistantSystem, designQuestionsPrompt, reportPrompt, stakeholderSystem, truncateFiles } from "./prompts";

const T = "2026-11-04T00:00:00.000Z";

test("stakeholderSystem includes every fact and persona rule and the original message", () => {
  const sys = stakeholderSystem(bannerScheduleTask);
  for (const f of bannerScheduleTask.facts) expect(sys).toContain(f);
  for (const r of bannerScheduleTask.personaRules) expect(sys).toContain(r);
  expect(sys).toContain(bannerScheduleTask.requirementMessage);
});

test("truncateFiles keeps total under budget, cutting the largest file first", () => {
  const files = { "/a.js": "x".repeat(100), "/b.js": "y".repeat(1000), "/c.js": "z".repeat(50) };
  const out = truncateFiles(files, 500);
  const total = Object.values(out).reduce((n, s) => n + s.length, 0);
  expect(total).toBeLessThanOrEqual(500);
  expect(out["/a.js"]).toBe("x".repeat(100));
  expect(out["/c.js"]).toBe("z".repeat(50));
  expect(out["/b.js"]).toContain("[잘림]");
});

test("assistantSystem embeds file contents with their paths", () => {
  const sys = assistantSystem({ "/src/App.jsx": "const a = 1;" });
  expect(sys).toContain("/src/App.jsx");
  expect(sys).toContain("const a = 1;");
});

test("designQuestionsPrompt lists ref ids, the assistant log, and asks for the three kinds", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "qa/add", question: "몇 명?", answer: "120만", at: T });
  s = reduce(s, { type: "spec/lock", at: T });
  s = reduce(s, { type: "chat/add", role: "user", text: "겹치면 최신 걸로 골라줘", at: T });
  s = reduce(s, { type: "files/set", files: { "/src/App.jsx": "a\nb\nc" } });
  const { system, user } = designQuestionsPrompt(s, bannerScheduleTask);
  expect(system).toContain("목록 밖의 id");
  expect(system).toContain("ai_direction");
  expect(system).toContain("extend");
  expect(user).toContain("qa-1");
  expect(user).toContain("chat-1");
  expect(user).toContain("겹치면 최신 걸로 골라줘");
  expect(user).toContain("code:src/App.jsx:1-3");
  expect(user).not.toContain("정의서");
});

test("reportPrompt includes competency definitions, checklist and ref ids", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "spec/lock", at: T });
  const { system, user } = reportPrompt(s, bannerScheduleTask);
  expect(system).toContain("요구사항 구체화");
  expect(system).toContain("확장 설계");
  expect(system).toContain("highlights");
  for (const c of bannerScheduleTask.checklist) expect(user).toContain(c);
  expect(user).not.toContain("정의서");
});

test("stakeholderSystem marks the service profile as already public to the candidate", () => {
  const sys = stakeholderSystem(bannerScheduleTask);
  expect(sys).toContain("이미 공개된 서비스 정보");
  for (const p of bannerScheduleTask.serviceProfile) expect(sys).toContain(p.value);
});
