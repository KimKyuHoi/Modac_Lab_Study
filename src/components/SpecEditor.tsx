import { Input } from "antd";

export const SPEC_MIN_CHARS = 50;

const PLACEHOLDER = `무엇을 만들지, 그리고 정해지지 않은 것을 어떻게 정했는지와 그 이유를 적으세요.

예)
- 예약은 국가, 시작·종료 일시를 갖는다.
- 같은 국가에서 기간이 겹치면 ___을 보여 준다. 이유: ___
- 시간대는 ___ 기준으로 비교한다.
- 동시 수정은 ___ 처리한다. 이유: ___
- 이번에 만들지 않는 것: ___`;

export function SpecEditor({ value, onChange, locked }: { value: string; onChange: (v: string) => void; locked: boolean }) {
  if (locked) {
    return (
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, padding: "12px 14px", background: "var(--frost)", borderRadius: 4, fontSize: 14.5 }}>
        {value}
      </div>
    );
  }
  return (
    <div>
      <Input.TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        autoSize={{ minRows: 10, maxRows: 24 }}
        aria-label="해결책 정의서"
        style={{ fontSize: 14.5, lineHeight: 1.65 }}
      />
      <div className="muted" style={{ fontSize: 13, marginTop: 6, textAlign: "right" }}>
        {value.length < SPEC_MIN_CHARS ? `${SPEC_MIN_CHARS}자 이상 적어 주세요 (${value.length}자)` : `${value.length}자`}
      </div>
    </div>
  );
}
