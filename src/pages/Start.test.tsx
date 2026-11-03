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

test("with a session in progress, offers 이어서 진행 that navigates to its phase", async () => {
  const { createSession, reduce } = await import("../session/reducer");
  let s = createSession("진행중", "2026-11-04T00:00:00.000Z");
  s = reduce(s, { type: "spec/lock", at: "2026-11-04T00:10:00.000Z" });
  render(
    <MemoryRouter initialEntries={["/"]}>
      <SessionProvider initial={s}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/build" element={<Where />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText("진행 중인 세션이 있어요", { exact: false })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "이어서 진행" }));
  expect(await screen.findByTestId("where")).toHaveTextContent("/build");
});
