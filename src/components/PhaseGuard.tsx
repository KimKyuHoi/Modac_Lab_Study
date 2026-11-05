import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "../session/store";
import type { Phase, Session } from "../session/types";

export function routeForPhase(s: Session): string {
  switch (s.phase) {
    case "clarify":
    case "build":
      return "/work";
    case "review":
      return "/review";
    case "done":
      return `/report/${s.id}`;
  }
}

export function PhaseGuard({ phase, children }: { phase: Phase | Phase[]; children: ReactNode }) {
  const { session } = useSession();
  const allowed = Array.isArray(phase) ? phase : [phase];
  if (!session) return <Navigate to="/" replace />;
  if (!allowed.includes(session.phase)) return <Navigate to={routeForPhase(session)} replace />;
  return <>{children}</>;
}
