/** 지원자가 실제로 작성하는 파일만 남긴다. Sandpack 템플릿 기본 파일과 진입 파일은 기록·프롬프트·근거에서 제외한다. */
export function candidateFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) if (p.startsWith("/src/")) out[p] = c;
  return out;
}
