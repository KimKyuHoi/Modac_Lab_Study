import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "../session/store";
import type { Phase, Session } from "../session/types";

export function routeForPhase(s: Session): string {
  switch (s.phase) {
    case "clarify":
      return "/task";
    case "build":
      return "/build";
    case "review":
      return "/review";
    case "done":
      return `/report/${s.id}`;
  }
}

export function PhaseGuard({ phase, children }: { phase: Phase; children: ReactNode }) {
  const { session } = useSession();
  if (!session) return <Navigate to="/" replace />;
  if (session.phase !== phase) return <Navigate to={routeForPhase(session)} replace />;
  return <>{children}</>;
}
