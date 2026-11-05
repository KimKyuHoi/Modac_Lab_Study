import { useCallback, useEffect, useRef, useState } from "react";
import { HOST_SOURCE, emptyPerf, isProbeMessage, reducePerf, type PerfState } from "./metrics";

/** 미리보기 iframe의 perfProbe.js가 보내는 측정값을 받고, 보급형 폰 모드 배수를 iframe에 보낸다. */
export function usePerfProbe() {
  const [perf, setPerf] = useState<PerfState>(() => emptyPerf());
  const probe = useRef<MessageEventSource | null>(null);
  const slowdown = useRef(1);

  const post = useCallback((msg: Record<string, unknown>) => {
    try {
      (probe.current as Window | null)?.postMessage({ source: HOST_SOURCE, ...msg }, "*");
    } catch {
      /* iframe이 사라졌으면 다음 boot 때 다시 보낸다 */
    }
  }, []);
  const send = useCallback((factor: number) => post({ type: "slowdown", factor }), [post]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isProbeMessage(e.data)) return;
      const msg = e.data;
      if (msg.type === "boot") {
        probe.current = e.source;
        // 미리보기가 새로 떠도 보급형 폰 모드는 유지한다
        if (slowdown.current > 1) send(slowdown.current);
      }
      setPerf((s) => reducePerf(s, msg));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  const setSlowdown = useCallback(
    (factor: number) => {
      slowdown.current = factor;
      send(factor);
      setPerf((s) => ({ ...s, slowdown: factor }));
    },
    [send],
  );

  /** 코드를 고친 뒤 처음부터 다시 잰다. Sandpack은 코드 변경을 모듈 교체로 반영해서 측정 코드가 다시 시작되지 않는다. */
  const remeasure = useCallback(() => {
    setPerf((s) => ({ ...emptyPerf(s.slowdown) }));
    post({ type: "reload" });
  }, [post]);

  /**
   * 최종 코드로 다시 재고, 첫 화면이 자리 잡을 때까지(settleMs) 기다린다.
   * 코드 변경은 모듈 교체로 반영돼 측정 코드가 다시 시작되지 않으므로, 그대로 기록하면 예전 코드의 수치가 남는다.
   */
  const latest = useRef(perf);
  latest.current = perf;
  const remeasureAndSettle = useCallback(
    async (settleMs = 3000, timeoutMs = 12000): Promise<PerfState | null> => {
      const startedAt = Date.now();
      remeasure();
      while (Date.now() - startedAt < timeoutMs) {
        await new Promise((r) => setTimeout(r, 250));
        const p = latest.current;
        if (p.booted && p.bootedAt !== null && p.bootedAt >= startedAt && Date.now() - p.bootedAt >= settleMs) return p;
      }
      return null;
    },
    [remeasure],
  );

  return { perf, setSlowdown, remeasure, remeasureAndSettle };
}
