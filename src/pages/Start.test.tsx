import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SessionProvider } from "../session/store";
import { loadCurrent } from "../session/persist";
import { StartPage } from "./Start";

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

beforeEach(() => localStorage.clear());

test("without a session, starts one immediately and navigates to /work", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <SessionProvider initial={null}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/work" element={<Where />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByTestId("where")).toHaveTextContent("/work");
  expect(loadCurrent()?.candidateName).toMatch(/^응시자 /);
});

test("with a session in progress, resumes it instead of starting a new one", async () => {
  const { createSession, reduce } = await import("../session/reducer");
  let s = createSession("진행중", "2026-11-04T00:00:00.000Z");
  s = reduce(s, { type: "spec/lock", at: "2026-11-04T00:10:00.000Z" });
  render(
    <MemoryRouter initialEntries={["/"]}>
      <SessionProvider initial={s}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/work" element={<Where />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByTestId("where")).toHaveTextContent("/work");
  expect(loadCurrent()?.candidateName ?? "진행중").toBe("진행중");
});
