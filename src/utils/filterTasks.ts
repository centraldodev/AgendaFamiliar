import type { TaskFilter } from "../models/Navigation";
import type { Task } from "../models/Task";
import { dueStatus } from "./dueStatus";
import { today } from "./today";
const byDueDate = (a: Task, b: Task) =>
  `${a.dueDate ?? ""} ${a.dueTime ?? ""}`.localeCompare(`${b.dueDate ?? ""} ${b.dueTime ?? ""}`);
// "Hoje" são as pendentes de hoje (e registros antigos sem data); atrasadas só em "Todas". "Concluídas" mostra as mais recentes primeiro.
export function filterTasks(
  tasks: Task[],
  filter: TaskFilter,
  todayDate: string = today(),
  now: Date = new Date(),
) {
  const matches = (task: Task) => {
    // Puladas ficam arquivadas junto das concluídas.
    const closed = task.completed || !!task.skipped;
    switch (filter) {
      case "today":
        return !closed && (task.dueDate || todayDate) === todayDate;
      case "overdue":
        return dueStatus(task, now) === "overdue";
      case "upcoming":
        return !closed && task.dueDate > todayDate;
      case "completed":
        return closed;
      case "private":
        return !!task.isPrivate;
      case "all":
        return true;
    }
  };
  const result = tasks.filter(matches);
  if (filter === "today" || filter === "overdue" || filter === "upcoming")
    return result.sort(byDueDate);
  return filter === "completed" ? result.sort((a, b) => byDueDate(b, a)) : result;
}
