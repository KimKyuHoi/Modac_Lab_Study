import { render, screen } from "@testing-library/react";
import { PhaseTimer } from "./PhaseTimer";

afterEach(() => vi.useRealTimers());

test("shows remaining time while within budget", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-04T00:10:00Z"));
  render(<PhaseTimer startedAt="2026-11-04T00:00:00Z" budgetMin={60} />);
  expect(screen.getByText("50:00 남음")).toBeInTheDocument();
});

test("shows overtime message after budget", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-04T01:05:30Z"));
  render(<PhaseTimer startedAt="2026-11-04T00:00:00Z" budgetMin={60} />);
  expect(screen.getByText("5:30 초과")).toBeInTheDocument();
  expect(screen.getByText("시간이 지났어요. 제출은 가능해요.")).toBeInTheDocument();
});
