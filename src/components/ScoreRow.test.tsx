import { render, screen } from "@testing-library/react";
import { createSession, reduce } from "../session/reducer";
import { ScoreRow } from "./ScoreRow";

const T = "2026-11-04T00:00:00.000Z";

function fixture() {
  let s = createSession("a", T);
  s = reduce(s, { type: "qa/add", question: "q", answer: "a", at: T });
  s = reduce(s, { type: "qa/add", question: "q2", answer: "a2", at: T });
  s = reduce(s, { type: "spec/edit", text: "정의서" });
  return s;
}

test("refs already cited inline are not repeated below the rationale", () => {
  render(
    <ScoreRow label="구조 이해" draftScore={3} rationale="이유를 설명했다[qa-1]." evidence={["qa-1", "qa-2"]} session={fixture()} onFinalChange={() => {}} onOpen={() => {}} locked={false} />,
  );
  expect(screen.getAllByRole("button", { name: "근거 qa-1" })).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: "근거 qa-2" })).toHaveLength(1);
});

test("shows 근거 부족 instead of a score when evidence is empty", () => {
  render(<ScoreRow label="구조 이해" draftScore={4} rationale="x" evidence={[]} session={fixture()} onFinalChange={() => {}} onOpen={() => {}} locked={false} />);
  expect(screen.getByText("근거 부족")).toBeInTheDocument();
  expect(screen.queryByLabelText("점수 초안 4점")).toBeNull();
});
