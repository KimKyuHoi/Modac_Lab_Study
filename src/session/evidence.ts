import type { PerfMetrics } from "../perf/metrics";
import type { Session } from "./types";

export type ParsedRef =
  | { kind: "qa" | "chat" | "dq" | "perf" | "spec"; id: string }
  | { kind: "code"; id: string; path: string; from: number; to: number };

export type ResolvedEvidence =
  | { kind: "qa"; id: string; question: string; answer: string }
  | { kind: "chat"; id: string; role: string; text: string }
  | { kind: "spec"; id: "spec"; text: string }
  | { kind: "dq"; id: string; question: string; answer?: string }
  | { kind: "perf"; id: string; at: string; label: string; metrics: PerfMetrics }
  | { kind: "code"; id: string; path: string; from: number; to: number; snippet: string };

const SIMPLE = /^(qa|chat|dq|perf)-(\d+)$/;
const CODE = /^code:([^:]+):(\d+)(?:-(\d+))?$/;

export function parseRef(ref: string): ParsedRef | null {
  if (ref === "spec") return { kind: "spec", id: "spec" };
  const m = SIMPLE.exec(ref);
  if (m) return { kind: m[1] as "qa" | "chat" | "dq" | "perf", id: ref };
  const c = CODE.exec(ref);
  if (c) {
    const from = Number(c[2]);
    const to = c[3] ? Number(c[3]) : from;
    return { kind: "code", id: ref, path: c[1], from, to };
  }
  return null;
}

/** Sandpack 파일 키는 "/src/App.jsx", ref 경로는 "src/App.jsx". 둘 다 받는다. */
function findFile(files: Record<string, string>, path: string): string | undefined {
  return files[path] ?? files[`/${path}`] ?? files[path.replace(/^\//, "")];
}

export function resolveRef(s: Session, ref: string): ResolvedEvidence | null {
  const p = parseRef(ref);
  if (!p) return null;
  switch (p.kind) {
    case "spec":
      return { kind: "spec", id: "spec", text: s.clarify.spec.text };
    case "qa": {
      const q = s.clarify.qa.find((x) => x.id === p.id);
      return q ? { kind: "qa", id: q.id, question: q.question, answer: q.answer } : null;
    }
    case "chat": {
      const c = s.build.chat.find((x) => x.id === p.id);
      return c ? { kind: "chat", id: c.id, role: c.role, text: c.text } : null;
    }
    case "dq": {
      const d = s.review.items.find((x) => x.id === p.id);
      return d ? { kind: "dq", id: d.id, question: d.question, answer: d.answer } : null;
    }
    case "perf": {
      const r = (s.build.perf ?? []).find((x) => x.id === p.id);
      return r ? { kind: "perf", id: r.id, at: r.at, label: r.label, metrics: r.metrics } : null;
    }
    case "code": {
      const content = findFile(s.build.files, p.path);
      if (content === undefined) return null;
      const lines = content.split("\n");
      if (p.from < 1 || p.from > lines.length) return null;
      const to = Math.min(p.to, lines.length);
      return { kind: "code", id: p.id, path: p.path, from: p.from, to, snippet: lines.slice(p.from - 1, to).join("\n") };
    }
  }
}

export function filterExisting(s: Session, refs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of refs) {
    if (seen.has(r)) continue;
    if (resolveRef(s, r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}

/** 프롬프트에 "쓸 수 있는 근거 id"로 넘기는 목록. 코드는 파일별 줄 범위 형식만 알려 준다. */
export function listRefIds(s: Session): string[] {
  const ids: string[] = s.clarify.spec.text.trim() ? ["spec"] : [];
  ids.push(...s.clarify.qa.map((q) => q.id));
  ids.push(...s.build.chat.map((c) => c.id));
  ids.push(...(s.build.perf ?? []).map((r) => r.id));
  ids.push(...s.review.items.map((d) => d.id));
  for (const [path, content] of Object.entries(s.build.files)) {
    const n = content.split("\n").length;
    ids.push(`code:${path.replace(/^\//, "")}:1-${n}`);
  }
  return ids;
}
