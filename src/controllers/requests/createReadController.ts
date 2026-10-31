import { withReadTimeout } from "../../utils/withReadTimeout.ts";
// Cada lista tem seu próprio ciclo de vida, independente do carregamento da sessão.
export function createReadController<T>(options: {
  load: () => Promise<T>;
  onData: (value: T) => void;
  onError: (error: unknown | null) => void;
  onSettled: () => void;
  isCurrent: () => boolean;
  timeoutMs?: number;
}) {
  let closed = false;
  let version = 0;
  let pending: Promise<void> | undefined;
  const current = (request: number) =>
    !closed && request === version && options.isCurrent();
  return {
    refresh(force = false): Promise<void> {
      if (closed) return Promise.resolve();
      if (pending && !force) return pending;
      const request = ++version;
      const result = (async () => {
        try {
          const value = await withReadTimeout(
            Promise.resolve().then(options.load),
            options.timeoutMs,
          );
          if (current(request)) {
            options.onData(value);
            options.onError(null);
          }
        } catch (error) {
          if (current(request)) {
            options.onError(error);
            throw error;
          }
        } finally {
          if (current(request)) options.onSettled();
          if (request === version) pending = undefined;
        }
      })();
      pending = result;
      return result;
    },
    close() {
      closed = true;
    },
  };
}
