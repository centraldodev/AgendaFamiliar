import type { Task } from "../models/Task";
const pad = (n: number) => String(n).padStart(2, "0");
const dateOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export type DueStatus = "overdue" | "soon" | null;
// Só pendentes recebem indicação:
// - "overdue": data já passou, ou é hoje e o horário já passou;
// - "soon": vence hoje (horário ainda por vir ou sem horário) ou amanhã.
// Tarefas no prazo (depois de amanhã) e sem data não têm indicação.
export function dueStatus(task: Task, now: Date = new Date()): DueStatus {
  if (task.completed || task.skipped || !task.dueDate) return null;
  const today = dateOf(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  if (task.dueDate < today) return "overdue";
  if (task.dueDate === today) {
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return task.dueTime && task.dueTime < time ? "overdue" : "soon";
  }
  return task.dueDate === dateOf(tomorrowDate) ? "soon" : null;
}
