import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntApp } from "antd";
import { SessionProvider } from "../session/store";
import { createSession, reduce } from "../session/reducer";
import { ReviewPage } from "./Review";

const judge = vi.fn();
vi.mock("../ai", () => ({
  judgeFollowUp: (...a: unknown[]) => judge(...a),
  generateDesignQuestions: vi.fn(),
  generateReport: vi.fn(),
  isConfigured: () => true,
  modelName: () => "m",
}));

beforeEach(() => localStorage.clear());

test("while the answer is being judged, the card stays active and says so", async () => {
  judge.mockReturnValue(new Promise(() => {})); // never settles
  let s = createSession("a", "2026-11-04T00:00:00.000Z");
  s = reduce(s, { type: "spec/lock", at: "2026-11-04T00:00:00.000Z" });
  s = reduce(s, { type: "build/submit", at: "2026-11-04T00:00:00.000Z" });
  s = reduce(s, {
    type: "review/setItems",
    items: [
      { id: "dq-1", kind: "ai_direction", question: "첫 질문", evidence: [] },
      { id: "dq-2", kind: "design", question: "둘째 질문", evidence: [] },
      { id: "dq-3", kind: "extend", question: "확장", evidence: [] },
    ],
  });
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <AntApp>
        <SessionProvider initial={s}>
          <ReviewPage />
        </SessionProvider>
      </AntApp>
    </MemoryRouter>,
  );
  await userEvent.type(screen.getByLabelText("1번 답변"), "pickBanner에서 createdAt으로 정렬합니다.");
  await userEvent.click(screen.getByRole("button", { name: "답변 저장" }));
  expect(await screen.findByText("답변을 읽고 있어요")).toBeInTheDocument();
  const first = screen.getByText("첫 질문").closest("section")!;
  expect(first).toHaveAttribute("aria-current", "step");
  expect(screen.getByText("둘째 질문").closest("section")).not.toHaveAttribute("aria-current");
});

test("after the last answer, nothing is generated until 최종 제출 is pressed", async () => {
  judge.mockResolvedValue({ ambiguous: false });
  const { generateReport } = await import("../ai");
  let s = createSession("a", "2026-11-04T00:00:00.000Z");
  s = reduce(s, { type: "build/submit", at: "2026-11-04T00:00:00.000Z" });
  s = reduce(s, {
    type: "review/setItems",
    items: [{ id: "dq-1", kind: "design", question: "하나뿐인 질문", evidence: [] }],
  });
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <AntApp>
        <SessionProvider initial={s}>
          <ReviewPage />
        </SessionProvider>
      </AntApp>
    </MemoryRouter>,
  );
  await userEvent.type(screen.getByLabelText("1번 답변"), "generation ref로 늦은 응답을 버립니다.");
  await userEvent.click(screen.getByRole("button", { name: "답변 저장" }));
  const final = await screen.findByRole("button", { name: "최종 제출" });
  expect(generateReport).not.toHaveBeenCalled();
  await userEvent.click(final);
  const dialog = await screen.findByRole("dialog");
  await userEvent.click(within(dialog).getByRole("button", { name: "최종 제출" }));
  expect(generateReport).toHaveBeenCalledTimes(1);
});
