import { useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { routeForPhase } from "../components/PhaseGuard";
import { useSession } from "../session/store";

function defaultCandidateName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `응시자 ${now.getMonth() + 1}/${now.getDate()} ${p(now.getHours())}:${p(now.getMinutes())}`;
}

/** 소개 화면 없이 바로 작업 화면으로 보낸다. 진행 중인 세션이 있으면 이어서, 없으면 새로 시작. */
export function StartPage() {
  const { start, session } = useSession();
  const navigate = useNavigate();
  const inProgress = session && session.phase !== "done" ? session : null;
  const started = useRef(false);

  useEffect(() => {
    if (inProgress || started.current) return;
    started.current = true;
    start(defaultCandidateName());
    navigate("/work", { replace: true });
  }, [inProgress, start, navigate]);

  if (inProgress) return <Navigate to={routeForPhase(inProgress)} replace />;
  return null;
}
