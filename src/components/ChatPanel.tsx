import { Button, Input } from "antd";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Turn } from "../ai/gemini";

type Props = {
  turns: Turn[];
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder: string;
  emptyText: string;
  pending: boolean;
  pendingText?: string;
  modelLabel: string;
  disabledText?: string;
};

export function ChatPanel({ turns, onSend, disabled, placeholder, emptyText, pending, pendingText, modelLabel, disabledText }: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns.length, pending]);

  const submit = async () => {
    const t = text.trim();
    if (!t || pending || disabled) return;
    try {
      await onSend(t);
      setText("");
    } catch {
      /* 실패 시 입력을 유지한다. 알림은 호출자가 띄운다. */
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {turns.length === 0 && !pending && (
          <p className="muted" style={{ fontSize: 14 }}>
            {emptyText}
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} style={{ alignSelf: t.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, textAlign: t.role === "user" ? "right" : "left" }}>
              {t.role === "user" ? "나" : modelLabel}
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 14.5,
                lineHeight: 1.6,
                padding: "10px 12px",
                borderRadius: 4,
                background: t.role === "user" ? "var(--frost)" : "transparent",
                border: t.role === "user" ? "none" : "1px solid var(--line)",
              }}
            >
              {t.text}
            </div>
          </div>
        ))}
        {pending && (
          <div className="muted" style={{ fontSize: 13 }}>
            {pendingText ?? "답을 쓰고 있어요"}
          </div>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--line)", padding: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={disabled ? (disabledText ?? "") : placeholder}
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={disabled || pending}
          aria-label="메시지"
        />
        <Button type="primary" onClick={() => void submit()} disabled={disabled || pending || !text.trim()}>
          보내기
        </Button>
      </div>
    </div>
  );
}
