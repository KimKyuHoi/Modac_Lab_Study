import { Button, Input } from "antd";
import { useState } from "react";
import type { ReviewItem } from "../session/types";

type Props = {
  item: ReviewItem;
  index: number;
  active: boolean;
  busy: boolean;
  judging?: boolean;
  onAnswer: (text: string) => void;
  onAnswerFollowUp: (text: string) => void;
};

const KIND_LABEL = { explain: "설명 질문", extend: "확장 설계 질문" } as const;

export function DesignQuestionCard({ item, index, active, busy, judging, onAnswer, onAnswerFollowUp }: Props) {
  const [text, setText] = useState("");
  const [followText, setFollowText] = useState("");
  const needsFollowUp = !!item.followUp && item.followUp.answer === undefined;

  return (
    <section
      aria-current={active ? "step" : undefined}
      style={{
        borderLeft: active ? "4px solid var(--pink)" : "4px solid var(--line)",
        padding: "16px 20px",
        marginBottom: 20,
        opacity: active || item.answer !== undefined ? 1 : 0.5,
      }}
    >
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        {index + 1}. {KIND_LABEL[item.kind]}
      </div>
      <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, maxWidth: "70ch" }}>{item.question}</p>

      {item.answer !== undefined ? (
        <>
          <p className="prose" style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "var(--muted)" }}>
            {item.answer}
          </p>
          {judging && (
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--pink)" }}>답변을 읽고 있어요</p>
          )}
        </>
      ) : (
        active && (
          <div style={{ marginTop: 12 }}>
            <Input.TextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoSize={{ minRows: 5, maxRows: 14 }}
              placeholder="코드의 어느 부분이 어떻게 동작하는지, 왜 그렇게 정했는지를 적으세요."
              aria-label={`${index + 1}번 답변`}
              disabled={busy}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Button type="primary" disabled={busy || text.trim().length < 10} loading={busy} onClick={() => onAnswer(text.trim())}>
                답변 저장
              </Button>
            </div>
          </div>
        )
      )}

      {item.followUp && (
        <div style={{ marginTop: 16, paddingLeft: 14, borderLeft: "2px solid var(--pink)" }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
            꼬리질문
          </div>
          <p style={{ fontWeight: 600, maxWidth: "70ch" }}>{item.followUp.question}</p>
          {item.followUp.answer !== undefined ? (
            <p className="prose" style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "var(--muted)" }}>
              {item.followUp.answer}
            </p>
          ) : (
            active &&
            needsFollowUp && (
              <div style={{ marginTop: 10 }}>
                <Input.TextArea
                  value={followText}
                  onChange={(e) => setFollowText(e.target.value)}
                  autoSize={{ minRows: 3, maxRows: 10 }}
                  aria-label={`${index + 1}번 꼬리질문 답변`}
                  disabled={busy}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <Button type="primary" disabled={busy || followText.trim().length < 5} loading={busy} onClick={() => onAnswerFollowUp(followText.trim())}>
                    답변 저장
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
