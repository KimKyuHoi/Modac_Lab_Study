import { render, screen } from "@testing-library/react";
import { createSession, reduce } from "../session/reducer";
import { EvidenceText } from "./EvidenceText";

const T = "2026-11-04T00:00:00.000Z";

test("renders a chip for [qa-2] and plain text around it", () => {
  let s = createSession("a", T);
  s = reduce(s, { type: "qa/add", question: "q1", answer: "a1", at: T });
  s = reduce(s, { type: "qa/add", question: "겹치면요?", answer: "안 정했어요", at: T });
  const onOpen = vi.fn();
  render(<EvidenceText text="질문이 겹침을 겨냥했다[qa-2]. 정의서도 있다[spec]." session={s} onOpen={onOpen} />);
  expect(screen.getByText("질문이 겹침을 겨냥했다", { exact: false })).toBeInTheDocument();
  const chip = screen.getByRole("button", { name: "근거 qa-2" });
  chip.click();
  expect(onOpen).toHaveBeenCalledWith("qa-2");
  expect(screen.getByRole("button", { name: "근거 spec" })).toBeInTheDocument();
});

test("unknown refs stay as plain text, not chips", () => {
  const s = createSession("a", T);
  render(<EvidenceText text="근거 없음[qa-9]" session={s} onOpen={() => {}} />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByText("근거 없음[qa-9]")).toBeInTheDocument();
});
