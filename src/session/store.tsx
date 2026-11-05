import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createSession, reduce, type Action } from "./reducer";
import { loadCurrent, saveFile, saveLocal } from "./persist";
import type { Session } from "./types";
import { currentTask } from "../task";

type Store = {
  session: Session | null;
  /** 렌더 지연 없이 최신 세션을 읽는다 (연속 dispatch 직후 등). */
  current: () => Session | null;
  dispatch: (a: Action) => Session | null;
  start: (name: string) => Session;
  load: (s: Session) => void;
  persistFile: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

/** 과제가 바뀐 뒤에는 이전 과제로 진행 중이던 세션을 이어 열지 않는다. 그 세션은 세션 목록에는 남는다. */
function resumable(s: Session | null): Session | null {
  if (s && s.phase !== "done" && s.taskId !== currentTask.id) return null;
  return s;
}

export function SessionProvider({ children, initial }: { children: ReactNode; initial?: Session | null }) {
  const [session, setSession] = useState<Session | null>(() => (initial !== undefined ? initial : resumable(loadCurrent())));
  // 연속 dispatch가 같은 렌더 안에서 일어나도 최신 상태를 기준으로 줄이도록 ref를 쓴다.
  const latest = useRef(session);
  latest.current = session;

  const dispatch = useCallback((a: Action) => {
    const cur = latest.current;
    if (!cur) return null;
    const next = reduce(cur, a);
    latest.current = next;
    saveLocal(next);
    setSession(next);
    return next;
  }, []);

  const start = useCallback((name: string) => {
    const s = createSession(name);
    latest.current = s;
    saveLocal(s);
    setSession(s);
    return s;
  }, []);

  const load = useCallback((s: Session) => {
    latest.current = s;
    saveLocal(s);
    setSession(s);
  }, []);

  const persistFile = useCallback(async () => {
    if (latest.current) await saveFile(latest.current);
  }, []);

  const current = useCallback(() => latest.current, []);

  const value = useMemo(() => ({ session, current, dispatch, start, load, persistFile }), [session, current, dispatch, start, load, persistFile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있어요.");
  return v;
}
