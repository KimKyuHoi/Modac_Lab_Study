export function EvidenceChip({ refId, onOpen }: { refId: string; onOpen: (ref: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`근거 ${refId}`}
      onClick={() => onOpen(refId)}
      style={{
        display: "inline",
        font: "inherit",
        fontSize: "0.85em",
        fontWeight: 600,
        color: "var(--pink)",
        background: "none",
        border: 0,
        padding: "0 2px",
        cursor: "pointer",
        verticalAlign: "baseline",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 3,
      }}
    >
      [{refId}]
    </button>
  );
}
