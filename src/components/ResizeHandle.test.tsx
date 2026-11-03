import { fireEvent, render, screen } from "@testing-library/react";
import { ResizeHandle } from "./ResizeHandle";

test("dragging the handle reports the horizontal delta", () => {
  const onDelta = vi.fn();
  render(<ResizeHandle onDelta={onDelta} label="왼쪽 패널 폭" />);
  const h = screen.getByRole("separator", { name: "왼쪽 패널 폭" });
  fireEvent.mouseDown(h, { clientX: 100 });
  fireEvent.mouseMove(document, { clientX: 140 });
  fireEvent.mouseUp(document);
  fireEvent.mouseMove(document, { clientX: 200 });
  expect(onDelta).toHaveBeenCalledTimes(1);
  expect(onDelta).toHaveBeenCalledWith(40);
});
