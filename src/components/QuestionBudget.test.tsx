import { render, screen } from "@testing-library/react";
import { QuestionBudget } from "./QuestionBudget";

test("renders 5 dots with used ones hollow and an aria label with the remaining count", () => {
  render(<QuestionBudget total={5} used={2} />);
  const dots = screen.getAllByTestId("budget-dot");
  expect(dots).toHaveLength(5);
  expect(dots.filter((d) => d.dataset.state === "full")).toHaveLength(3);
  expect(dots.filter((d) => d.dataset.state === "empty")).toHaveLength(2);
  expect(screen.getByLabelText("남은 질문 3개")).toBeInTheDocument();
});

test("all dots hollow when exhausted and text says none left", () => {
  render(<QuestionBudget total={5} used={5} />);
  expect(screen.getAllByTestId("budget-dot").filter((d) => d.dataset.state === "full")).toHaveLength(0);
  expect(screen.getByText("질문을 다 썼어요")).toBeInTheDocument();
});
