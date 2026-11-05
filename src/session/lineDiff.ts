export type DiffLine = { type: "ctx" | "add" | "del"; text: string; oldNo?: number; newNo?: number };
export type LineDiff = { added: number; removed: number; lines: DiffLine[] };

const MAX_CELLS = 600_000; // 이보다 크면 LCS 대신 전체 교체로 본다

/** 줄 단위 diff (LCS). 과제 파일은 수백 줄 이하라 단순 DP로 충분하다. */
export function lineDiff(before: string | null, after: string): LineDiff {
  const a = before === null || before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  const n = a.length;
  const m = b.length;

  if (n * m > MAX_CELLS) {
    const lines: DiffLine[] = [...a.map((t, i) => ({ type: "del" as const, text: t, oldNo: i + 1 })), ...b.map((t, i) => ({ type: "add" as const, text: t, newNo: i + 1 }))];
    return { added: m, removed: n, lines };
  }

  // dp[i][j] = a[i..], b[j..]의 LCS 길이
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({ type: "ctx", text: a[i], oldNo: i + 1, newNo: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ type: "del", text: a[i], oldNo: i + 1 });
      i++;
    } else {
      lines.push({ type: "add", text: b[j], newNo: j + 1 });
      j++;
    }
  }
  while (i < n) lines.push({ type: "del", text: a[i], oldNo: ++i });
  while (j < m) lines.push({ type: "add", text: b[j], newNo: ++j });

  return { added: lines.filter((l) => l.type === "add").length, removed: lines.filter((l) => l.type === "del").length, lines };
}

/** 바뀐 줄 주변 context줄만 남긴다. 끊긴 곳은 null로 표시한다. */
export function hunks(d: LineDiff, context = 2): (DiffLine | null)[] {
  const keep = new Array(d.lines.length).fill(false);
  d.lines.forEach((l, i) => {
    if (l.type === "ctx") return;
    for (let k = Math.max(0, i - context); k <= Math.min(d.lines.length - 1, i + context); k++) keep[k] = true;
  });
  const out: (DiffLine | null)[] = [];
  let gap = false;
  d.lines.forEach((l, i) => {
    if (keep[i]) {
      if (gap && out.length > 0) out.push(null);
      out.push(l);
      gap = false;
    } else gap = true;
  });
  return out;
}

/** 프롬프트용 짧은 unified diff 텍스트 */
export function diffText(d: LineDiff, maxLines = 80): string {
  const body = hunks(d)
    .map((l) => (l === null ? "…" : `${l.type === "add" ? "+" : l.type === "del" ? "-" : " "} ${l.text}`))
    .slice(0, maxLines);
  return body.join("\n");
}
