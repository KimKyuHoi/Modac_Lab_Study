import { useEffect, useRef } from "react";

/** 세로 드래그 손잡이. 가로 이동량(px)을 onDelta로 알린다. 드래그 중에는 문서 전체에서 마우스를 따라간다. */
export function ResizeHandle({ onDelta, label }: { onDelta: (dx: number) => void; label: string }) {
  const last = useRef<number | null>(null);
  const cb = useRef(onDelta);
  cb.current = onDelta;

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (last.current === null) return;
      const dx = e.clientX - last.current;
      last.current = e.clientX;
      if (dx !== 0) cb.current(dx);
    };
    const up = () => {
      if (last.current === null) return;
      last.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={0}
      onMouseDown={(e) => {
        e.preventDefault();
        last.current = e.clientX;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onDelta(-24);
        if (e.key === "ArrowRight") onDelta(24);
      }}
      style={{ width: 6, cursor: "col-resize", background: "var(--line)", flexShrink: 0 }}
    />
  );
}
