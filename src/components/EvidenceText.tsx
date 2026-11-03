import type { ReactNode } from "react";
import { resolveRef } from "../session/evidence";
import type { Session } from "../session/types";
import { EvidenceChip } from "./EvidenceChip";

const REF = /\[([^[\]\s]+)\]/g;

/** "…했다[qa-2]." 처럼 본문 안의 근거 id를 각주 칩으로 바꾼다. 존재하지 않는 id는 그대로 둔다. */
export function EvidenceText({ text, session, onOpen }: { text: string; session: Session; onOpen: (ref: string) => void }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  REF.lastIndex = 0;
  while ((m = REF.exec(text))) {
    const ref = m[1];
    if (!resolveRef(session, ref)) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<EvidenceChip key={`${ref}-${m.index}`} refId={ref} onOpen={onOpen} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span style={{ lineHeight: 1.7 }}>{parts}</span>;
}
