import { useEffect, useRef } from "react";
import { AppState } from "react-native";
// Atualiza periodicamente só com o app em primeiro plano; ao voltar, atualiza na hora.
// Cada consulta custa leituras no Firestore: em segundo plano não há por que gastar.
export function usePolling(
  tick: () => void,
  intervalMs: number,
  enabled = true,
) {
  const latest = useRef(tick);
  latest.current = tick;
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => latest.current(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    if (AppState.currentState !== "background") start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        latest.current();
        start();
      } else if (state === "background") stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [enabled, intervalMs]);
}
