import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppRoutes } from "./App";

// Sandpack 런타임은 jsdom에서 iframe 주소를 다루다 비동기로 실패한다. 여기서는 라우팅만 본다.
vi.mock("./components/SandpackWorkbench", () => ({ SandpackWorkbench: () => null }));

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

beforeEach(() => {
  localStorage.clear();
  // jsdom에는 Element.scrollTo가 없다 (Work 화면의 채팅 목록이 사용)
  Element.prototype.scrollTo = () => {};
});

test("root goes straight to the work screen", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AppRoutes />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByTestId("where")).toHaveTextContent("/work");
});
