import { useEffect, useState } from "react";

function fmt(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PhaseTimer({ startedAt, budgetMin, overtimeText = "시간이 지났어요. 제출은 가능해요." }: { startedAt: string; budgetMin: number; overtimeText?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const budget = budgetMin * 60;
  const over = elapsed > budget;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontVariantNumeric: "tabular-nums" }} role="timer">
      <span style={{ fontWeight: 700, color: over ? "var(--pink)" : "var(--ink)" }}>{over ? `${fmt(elapsed - budget)} 초과` : `${fmt(budget - elapsed)} 남음`}</span>
      {over && <span style={{ fontSize: 13, color: "var(--pink)" }}>{overtimeText}</span>}
    </div>
  );
}
