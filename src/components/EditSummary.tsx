import { useMemo, useState } from "react";
import { hunks, lineDiff } from "../session/lineDiff";
import type { AppliedEdit } from "../session/types";

/** 도우미가 에디터에 바로 적용한 변경. 파일별 +/− 줄 수, 펼치면 diff, 되돌리기. */
export function EditSummary({ edits, onRevert, onOpen }: { edits: AppliedEdit[]; onRevert: (path: string) => void; onOpen: (path: string) => void }) {
  return (
    <div className="edit-summary" aria-label="도우미가 에디터에 적용한 변경">
      {edits.map((e) => (
        <EditRow key={e.path} edit={e} onRevert={() => onRevert(e.path)} onOpen={() => onOpen(e.path)} />
      ))}
    </div>
  );
}

function EditRow({ edit, onRevert, onOpen }: { edit: AppliedEdit; onRevert: () => void; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const d = useMemo(() => lineDiff(edit.before, edit.after), [edit.before, edit.after]);
  const name = edit.path.replace(/^\/src\//, "");
  return (
    <div className={edit.reverted ? "edit-row reverted" : "edit-row"}>
      <div className="edit-head">
        <button type="button" className="edit-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "▾" : "▸"} {name}
          {edit.before === null && <span className="edit-tag">새 파일</span>}
        </button>
        <span className="edit-add">+{d.added}</span>
        <span className="edit-del">−{d.removed}</span>
        <span className="edit-actions">
          {edit.reverted ? (
            <span className="edit-tag">되돌림</span>
          ) : (
            <>
              <button type="button" onClick={onOpen}>
                열기
              </button>
              <button type="button" onClick={onRevert}>
                되돌리기
              </button>
            </>
          )}
        </span>
      </div>
      {open && (
        <pre className="edit-diff">
          {hunks(d).map((l, i) =>
            l === null ? (
              <div key={i} className="gap">
                ⋯
              </div>
            ) : (
              <div key={i} className={l.type}>
                <span className="no">{l.newNo ?? l.oldNo}</span>
                <span className="sign">{l.type === "add" ? "+" : l.type === "del" ? "−" : " "}</span>
                <span>{l.text || " "}</span>
              </div>
            ),
          )}
        </pre>
      )}
    </div>
  );
}
