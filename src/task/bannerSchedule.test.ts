import { bannerScheduleTask } from "./bannerSchedule";

test("checklist has 5 items", () => {
  expect(bannerScheduleTask.checklist).toHaveLength(5);
});

test("starterFiles contains /src/App.jsx and /src/api/banners.js", () => {
  expect(Object.keys(bannerScheduleTask.starterFiles)).toEqual(
    expect.arrayContaining(["/src/App.jsx", "/src/api/banners.js", "/src/user.js"]),
  );
});

test("facts mention 120만 and KR, JP, US", () => {
  const joined = bannerScheduleTask.facts.join("\n");
  expect(joined).toContain("120만");
  expect(joined).toContain("KR, JP, US");
});

test("requirement message is the vague marketing message", () => {
  expect(bannerScheduleTask.requirementMessage).toContain("다음 캠페인 전에 될까요?");
});
