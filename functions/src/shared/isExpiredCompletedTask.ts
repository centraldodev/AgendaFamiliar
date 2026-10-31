export const completedRetentionMs = 7 * 24 * 60 * 60 * 1000;
// Concluída ou pulada há mais de uma semana (updatedAt registra o momento).
// Registros antigos sem updatedAt são mantidos, pois não há como saber a data.
export function isExpiredCompletedTask(
  task: Record<string, unknown>,
  now: number = Date.now(),
): boolean {
  if (task.completed !== true && task.skipped !== true) return false;
  const updatedAt = task.updatedAt as { toMillis?: () => number } | undefined;
  if (typeof updatedAt?.toMillis !== "function") return false;
  return now - updatedAt.toMillis() > completedRetentionMs;
}
