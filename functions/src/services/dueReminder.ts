// Regras puras do aviso de vencimento (testadas sem Firestore).
// Datas da agenda são "AAAA-MM-DD" no horário de Brasília.
export const appTimeZone = "America/Sao_Paulo";
/** Horário do aviso para tarefas sem horário definido. */
export const defaultReminderTime = "08:00";
/** Atraso máximo para ainda enviar (cobre falhas pontuais do agendador). */
export const reminderWindowMinutes = 60;
export function localParts(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: appTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}
const minutesOf = (date: string, time: string) =>
  Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 60000 +
  +time.slice(0, 2) * 60 +
  +time.slice(3, 5);
/** Identifica a ocorrência: mudar data/horário (ou avançar a recorrência) gera um novo aviso. */
export function reminderKey(task: Record<string, unknown>) {
  return `${task.dueDate} ${task.dueTime || defaultReminderTime}`;
}
// Avisa pendentes cujo horário chegou há no máximo reminderWindowMinutes.
// Tarefas criadas já vencidas não disparam aviso.
export function isReminderDue(task: Record<string, unknown>, now: Date) {
  if (task.completed === true || task.skipped === true) return false;
  if (typeof task.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))
    return false;
  const time =
    typeof task.dueTime === "string" && /^\d{2}:\d{2}$/.test(task.dueTime)
      ? task.dueTime
      : defaultReminderTime;
  const local = localParts(now);
  const late = minutesOf(local.date, local.time) - minutesOf(task.dueDate, time);
  return late >= 0 && late <= reminderWindowMinutes;
}
