import { bannerScheduleTask } from "./bannerSchedule";

test("checklist has 5 items", () => {
  expect(bannerScheduleTask.checklist).toHaveLength(5);
});

test("starterFiles contains /src/App.jsx and /src/api/banners.js", () => {
  expect(Object.keys(bannerScheduleTask.starterFiles)).toEqual(
    expect.arrayContaining(["/src/App.jsx", "/src/api/banners.js", "/src/user.js"]),
  );
});

test("serviceProfile includes infra and deployment settings", () => {
  const labels = bannerScheduleTask.serviceProfile.map((p) => p.label);
  expect(labels).toEqual(expect.arrayContaining(["배포", "인프라", "CI/CD", "모니터링"]));
});

test("requirement message is the vague marketing message", () => {
  expect(bannerScheduleTask.requirementMessage).toContain("다음 캠페인 전에 될까요?");
});

test("serviceProfile lists the public service specs (MAU, years, traffic, stack, team)", () => {
  const labels = bannerScheduleTask.serviceProfile.map((p) => p.label);
  expect(labels).toEqual(expect.arrayContaining(["월간 사용자", "운영 기간", "트래픽", "기술 스택", "운영 팀"]));
  expect(bannerScheduleTask.serviceProfile.find((p) => p.label === "월간 사용자")?.value).toContain("120만");
});

test("hidden facts no longer repeat the public service specs", () => {
  const joined = bannerScheduleTask.facts.join("\n");
  expect(joined).not.toContain("120만");
  expect(joined).toContain("KR, JP, US");
});
