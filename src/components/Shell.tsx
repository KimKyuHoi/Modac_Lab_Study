import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "../session/store";
import { routeForPhase } from "./PhaseGuard";

const PHASES = ["과제와 질문", "구현", "설계 질의", "리포트"];

export function Shell({ step, right, children, wide }: { step?: number; right?: ReactNode; children: ReactNode; wide?: boolean }) {
  const { session } = useSession();
  // 응시 중에는 로고가 현재 단계로 돌아간다. 실수로 시작 화면에 가서 세션을 잃지 않게.
  const home = session && session.phase !== "done" ? routeForPhase(session) : "/";
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "0 24px",
          height: 52,
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        <Link to={home} style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          AI 활용 과제 평가
        </Link>
        {step !== undefined && (
          <ol style={{ display: "flex", gap: 20, margin: 0, padding: 0, listStyle: "none", fontSize: 14 }}>
            {PHASES.map((name, i) => {
              const state = i < step ? "done" : i === step ? "now" : "todo";
              return (
                <li
                  key={name}
                  aria-current={state === "now" ? "step" : undefined}
                  style={{
                    color: state === "now" ? "var(--ink)" : "var(--muted)",
                    fontWeight: state === "now" ? 700 : 400,
                    textDecoration: state === "done" ? "line-through" : "none",
                  }}
                >
                  {name}
                </li>
              );
            })}
          </ol>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>{right}</div>
      </header>
      <div style={{ flex: 1, minHeight: 0, maxWidth: wide ? "none" : 1200, width: "100%", margin: wide ? 0 : "0 auto" }}>{children}</div>
    </div>
  );
}
