import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App";

test("renders start page with 응시 시작 button", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "응시 시작" })).toBeInTheDocument();
});
