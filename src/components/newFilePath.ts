const ALLOWED = /\.(jsx?|css)$/;

/**
 * 응시자가 입력한 새 파일 이름을 Sandpack 경로("/src/...")로 바꾼다. 쓸 수 없으면 이유를 돌려준다.
 * "hooks/useX.js", "src/useX.js", "/src/useX.js" 모두 /src 아래로 들어간다.
 */
export function newFilePath(input: string, existing: string[]): { path: string } | { error: string } {
  const raw = input.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/^src\//, "");
  if (!raw) return { error: "파일 이름을 적어 주세요." };
  if (raw.split("/").some((seg) => !seg || seg === "." || seg === "..")) return { error: "경로에 빈 칸이나 . .. 은 쓸 수 없어요." };
  if (!/^[\w./-]+$/.test(raw)) return { error: "영문, 숫자, - _ . / 만 쓸 수 있어요." };
  if (!ALLOWED.test(raw)) return { error: ".js, .jsx, .css 파일만 만들 수 있어요." };
  const path = `/src/${raw}`;
  if (existing.includes(path)) return { error: "같은 이름의 파일이 이미 있어요." };
  return { path };
}

/** 새 파일의 첫 내용. 빈 파일보다 무엇을 넣는 곳인지 보이게 한다. */
export function starterContent(path: string): string {
  if (path.endsWith(".css")) return "";
  return "// 새 파일\n";
}
