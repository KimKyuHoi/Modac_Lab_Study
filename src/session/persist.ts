import type { Session } from "./types";

const CURRENT = "session:current";
const key = (id: string) => `session:${id}`;

function safeGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export function saveLocal(s: Session): void {
  try {
    localStorage.setItem(key(s.id), JSON.stringify(s));
    localStorage.setItem(CURRENT, s.id);
  } catch {
    /* 저장 공간 문제는 무시. 파일 저장이 백업이다. */
  }
}

export function loadLocal(id: string): Session | null {
  const raw = safeGet(key(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    return parsed && typeof parsed === "object" && parsed.id === id ? parsed : null;
  } catch {
    return null;
  }
}

export function loadCurrent(): Session | null {
  const id = safeGet(CURRENT);
  return id ? loadLocal(id) : null;
}

export function clearCurrent(): void {
  try {
    localStorage.removeItem(CURRENT);
  } catch {
    /* noop */
  }
}

export function listLocal(): Session[] {
  const out: Session[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("session:") || k === CURRENT) continue;
      const s = loadLocal(k.slice("session:".length));
      if (s) out.push(s);
    }
  } catch {
    /* noop */
  }
  return out;
}

export async function saveFile(s: Session): Promise<void> {
  const res = await fetch(`/__sessions/${s.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s, null, 2),
  });
  if (!res.ok) throw new Error(`세션 파일 저장 실패 (${res.status})`);
}

export async function listFiles(): Promise<Session[]> {
  const res = await fetch("/__sessions");
  if (!res.ok) return [];
  return (await res.json()) as Session[];
}
