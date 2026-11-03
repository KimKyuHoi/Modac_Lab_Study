import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SessionProvider } from "../session/store";
import { loadCurrent } from "../session/persist";
import { StartPage } from "./Start";

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

beforeEach(() => localStorage.clear());

test("start creates a session and navigates to /task", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <SessionProvider initial={null}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/task" element={<Where />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
  await userEvent.type(screen.getByLabelText("이름"), "김규회");
  await userEvent.click(screen.getByRole("button", { name: "응시 시작" }));
  expect(await screen.findByTestId("where")).toHaveTextContent("/task");
  expect(loadCurrent()?.candidateName).toBe("김규회");
});

test("start button is disabled until a name is typed", () => {
  render(
    <MemoryRouter>
      <SessionProvider initial={null}>
        <StartPage />
      </SessionProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "응시 시작" })).toBeDisabled();
});
