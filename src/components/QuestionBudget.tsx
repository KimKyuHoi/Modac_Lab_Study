export function QuestionBudget({ total, used }: { total: number; used: number }) {
  const remaining = Math.max(0, total - used);
  return (
    <div aria-label={`남은 질문 ${remaining}개`} role="status" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", gap: 6 }} aria-hidden>
        {Array.from({ length: total }, (_, i) => {
          const full = i < remaining;
          return (
            <span
              key={i}
              data-testid="budget-dot"
              data-state={full ? "full" : "empty"}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid var(--accent)",
                background: full ? "var(--accent)" : "transparent",
                transition: "background 150ms ease",
              }}
            />
          );
        })}
      </div>
      <span style={{ fontSize: 14, color: remaining === 0 ? "var(--warn)" : "var(--muted)" }}>
        {remaining === 0 ? "질문을 다 썼어요" : `질문 ${remaining}번 남음`}
      </span>
    </div>
  );
}
