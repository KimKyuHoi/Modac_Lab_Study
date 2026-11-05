import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { summarize } from "../perf/metrics";
import { parseRef } from "../session/evidence";
import type { Session } from "../session/types";

export type Tab = "code" | "qa" | "chat" | "perf";
/** 질문의 근거 칩을 누르면 바뀐다. n은 같은 근거를 다시 눌러도 다시 스크롤하게 하는 값. */
export type Focus = { ref: string; n: number } | null;

const TABS: { key: Tab; label: string }[] = [
  { key: "code", label: "제출 코드" },
  { key: "qa", label: "실무진 Q&A" },
  { key: "chat", label: "도우미 대화" },
  { key: "perf", label: "성능 기록" },
];

const toKey = (path: string) => (path.startsWith("/") ? path : `/${path}`);

/** 근거 목록에서 파일별로 강조할 줄 번호를 모은다. */
export function codeHighlights(refs: string[]): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  for (const r of refs) {
    const p = parseRef(r);
    if (p?.kind !== "code") continue;
    const key = toKey(p.path);
    const set = out.get(key) ?? new Set<number>();
    for (let i = p.from; i <= p.to; i++) set.add(i);
    out.set(key, set);
  }
  return out;
}

export function tabForRef(ref: string): Tab | null {
  const p = parseRef(ref);
  if (!p) return null;
  if (p.kind === "code") return "code";
  if (p.kind === "qa" || p.kind === "chat" || p.kind === "perf") return p.kind;
  return null;
}

/** 설계 질의 중에 보는 기록: 제출 코드(읽기 전용), 실무진 Q&A, 도우미 대화, 성능 기록. */
export function RecordViewer({ session, focus, highlightRefs }: { session: Session; focus: Focus; highlightRefs: string[] }) {
  const files = useMemo(() => Object.keys(session.build.files).sort(), [session.build.files]);
  const [tab, setTab] = useState<Tab>("code");
  const [file, setFile] = useState<string>(() => files[0] ?? "");
  const scroller = useRef<HTMLDivElement>(null);
  const highlights = useMemo(() => codeHighlights(highlightRefs), [highlightRefs]);
  const focused = focus ? parseRef(focus.ref) : null;

  // 근거를 누르면 해당 탭과 파일로 가서 그 위치를 화면 가운데로 가져온다.
  useEffect(() => {
    if (!focus) return;
    const p = parseRef(focus.ref);
    const t = tabForRef(focus.ref);
    if (!p || !t) return;
    setTab(t);
    if (p.kind === "code") setFile(toKey(p.path));
    const anchor = p.kind === "code" ? `L${p.from}` : p.id;
    // 탭과 파일이 바뀐 뒤 그려진 다음에 스크롤한다
    requestAnimationFrame(() => scroller.current?.querySelector(`[data-anchor="${anchor}"]`)?.scrollIntoView({ block: "center" }));
  }, [focus]);

  const code = session.build.files[file] ?? "";
  const fileHl = highlights.get(file);
  const focusLines = focused?.kind === "code" && toKey(focused.path) === file ? [focused.from, focused.to] : null;
  const perf = session.build.perf ?? [];

  return (
    <div className="record-viewer">
      <div className="rv-tabs" role="tablist" aria-label="기록">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "code" && (
        <div className="rv-files" role="tablist" aria-label="파일">
          {files.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={file === f} className={file === f ? "on" : ""} onClick={() => setFile(f)}>
              {f.replace(/^\/src\//, "")}
              {highlights.has(f) && <span className="rv-dot" aria-label="이 질문의 근거가 있는 파일" />}
            </button>
          ))}
        </div>
      )}

      <div ref={scroller} className="rv-body" role="tabpanel">
        {tab === "code" &&
          (code ? (
            <pre className="rv-code" aria-label={`${file} 읽기 전용`}>
              {code.split("\n").map((line, i) => {
                const n = i + 1;
                const hl = fileHl?.has(n);
                const isFocus = focusLines && n >= focusLines[0] && n <= focusLines[1];
                return (
                  <div key={n} data-anchor={`L${n}`} className={isFocus ? "rv-line focus" : hl ? "rv-line hl" : "rv-line"}>
                    <span className="rv-ln">{n}</span>
                    <span>{line || " "}</span>
                  </div>
                );
              })}
            </pre>
          ) : (
            <p className="rv-empty">제출한 파일이 없어요.</p>
          ))}

        {tab === "qa" &&
          (session.clarify.qa.length === 0 ? (
            <p className="rv-empty">실무진에게 질문하지 않았어요.</p>
          ) : (
            session.clarify.qa.map((q) => (
              <div key={q.id} data-anchor={q.id} className={focused?.id === q.id ? "rv-item focus" : "rv-item"}>
                <div className="rv-meta">{q.id}</div>
                <p className="rv-q">{q.question}</p>
                <p className="rv-a">{q.answer}</p>
              </div>
            ))
          ))}

        {tab === "chat" &&
          (session.build.chat.length === 0 ? (
            <p className="rv-empty">도우미를 쓰지 않았어요.</p>
          ) : (
            session.build.chat.map((c) => (
              <div key={c.id} data-anchor={c.id} className={focused?.id === c.id ? "rv-item focus" : "rv-item"}>
                <div className="rv-meta">
                  {c.id} · {c.role === "user" ? "나" : "도우미"}
                  {c.images?.length ? ` · 화면 캡처 ${c.images.length}장` : ""}
                </div>
                <p className={c.role === "user" ? "rv-q" : "rv-a"} style={{ whiteSpace: "pre-wrap" }}>
                  {c.text}
                </p>
              </div>
            ))
          ))}

        {tab === "perf" &&
          (perf.length === 0 ? (
            <p className="rv-empty">성능 기록이 없어요.</p>
          ) : (
            perf.map((r) => (
              <Fragment key={r.id}>
                <div data-anchor={r.id} className={focused?.id === r.id ? "rv-item focus" : "rv-item"}>
                  <div className="rv-meta">
                    {r.id} · {r.label} · {new Date(r.at).toLocaleTimeString()}
                  </div>
                  <p className="rv-a">{summarize(r.metrics)}</p>
                </div>
              </Fragment>
            ))
          ))}
      </div>
    </div>
  );
}

/** 질문 카드의 근거 칩에 보일 짧은 이름 */
export function refLabel(ref: string): string {
  const p = parseRef(ref);
  if (!p) return ref;
  switch (p.kind) {
    case "code":
      return `${p.path.split("/").pop()} ${p.from}${p.to !== p.from ? `–${p.to}` : ""}행`;
    case "qa":
      return `실무진 Q&A ${ref.split("-")[1]}`;
    case "chat":
      return `도우미 대화 ${ref.split("-")[1]}`;
    case "perf":
      return `성능 기록 ${ref.split("-")[1]}`;
    case "dq":
      return `설계 질의 ${ref.split("-")[1]}`;
    case "spec":
      return "정의서";
  }
}
