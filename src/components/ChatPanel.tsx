import { Button, Image, Input, Tooltip } from "antd";
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import type { Turn } from "../ai/gemini";
import { imageFiles, toCompactDataUrl } from "./imageAttach";

const MAX_IMAGES = 3;

type Props = {
  turns: Turn[];
  onSend: (text: string, images: string[]) => Promise<void>;
  disabled?: boolean;
  placeholder: string;
  emptyText: string;
  pending: boolean;
  pendingText?: string;
  modelLabel: string;
  disabledText?: string;
  /** 화면 캡처 붙여넣기(⌘V)와 첨부 버튼을 켠다. */
  allowImages?: boolean;
};

export function ChatPanel({ turns, onSend, disabled, placeholder, emptyText, pending, pendingText, modelLabel, disabledText, allowImages }: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns.length, pending]);

  const addImages = async (files: File[]) => {
    if (files.length === 0) return;
    setImageError(null);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setImageError(`이미지는 한 번에 ${MAX_IMAGES}장까지 보낼 수 있어요.`);
      return;
    }
    try {
      const urls = await Promise.all(files.slice(0, room).map((f) => toCompactDataUrl(f)));
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
      if (files.length > room) setImageError(`이미지는 한 번에 ${MAX_IMAGES}장까지 보낼 수 있어요.`);
    } catch {
      setImageError("이미지를 읽지 못했어요. PNG나 JPG로 다시 붙여넣어 주세요.");
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!allowImages) return;
    const files = imageFiles(e.clipboardData?.items);
    if (files.length > 0) {
      e.preventDefault();
      void addImages(files);
    }
  };

  const submit = async () => {
    const t = text.trim();
    if ((!t && images.length === 0) || pending || disabled) return;
    try {
      await onSend(t, images);
      setText("");
      setImages([]);
      setImageError(null);
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

  const canSend = !disabled && !pending && (text.trim().length > 0 || images.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: "1 1 0", minHeight: 0 }}>
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
            {t.images && t.images.length > 0 && (
              <Image.PreviewGroup>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginBottom: t.text ? 6 : 0 }}>
                  {t.images.map((src, j) => (
                    <Image key={j} src={src} width={120} height={80} style={{ objectFit: "cover", borderRadius: 4 }} alt={`첨부한 화면 캡처 ${j + 1}`} />
                  ))}
                </div>
              </Image.PreviewGroup>
            )}
            {t.text && (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: t.role === "user" ? "var(--chrome-2)" : "var(--paper)",
                  color: t.role === "user" ? "var(--chrome-text)" : "var(--ink)",
                  border: t.role === "user" ? "none" : "1px solid var(--panel-line)",
                }}
              >
                {t.text}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="muted" style={{ fontSize: 13 }}>
            {pendingText ?? "답을 쓰고 있어요"}
          </div>
        )}
      </div>
      <div className="chat-compose" style={{ padding: 12 }}>
        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={src} alt={`보낼 화면 캡처 ${i + 1}`} style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 4, display: "block", border: "1px solid var(--panel-line)" }} />
                <button
                  type="button"
                  aria-label={`화면 캡처 ${i + 1} 빼기`}
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: 0,
                    background: "#555",
                    color: "#fff",
                    fontSize: 12,
                    lineHeight: "18px",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {imageError && <p style={{ fontSize: 12, color: "var(--warn)", marginBottom: 6 }}>{imageError}</p>}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {allowImages && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  void addImages(imageFiles(e.target.files));
                  e.target.value = "";
                }}
              />
              <Tooltip title="화면 캡처 첨부 (붙여넣기도 돼요)">
                <Button aria-label="화면 캡처 첨부" onClick={() => fileRef.current?.click()} disabled={disabled || pending || images.length >= MAX_IMAGES}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="11" r="2" />
                    <path d="M21 17l-5-5-8 7" />
                  </svg>
                </Button>
              </Tooltip>
            </>
          )}
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            onPaste={onPaste}
            placeholder={disabled ? (disabledText ?? "") : placeholder}
            autoSize={{ minRows: 1, maxRows: 5 }}
            disabled={disabled || pending}
            aria-label="메시지"
          />
          <Button type="primary" onClick={() => void submit()} disabled={!canSend}>
            보내기
          </Button>
        </div>
      </div>
    </div>
  );
}
