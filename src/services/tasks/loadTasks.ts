import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import type { Task } from "../../models/Task";
export async function loadTasks(): Promise<Task[]> {
  const result = await httpsCallable<unknown, { tasks: Task[] }>(
    functions,
    "agendaSimpleTasks",
    { timeout: 15000 },
  )({});
  return result.data.tasks.sort((a, b) =>
    `${a.dueDate} ${a.dueTime ?? ""}`.localeCompare(
      `${b.dueDate} ${b.dueTime ?? ""}`,
    ),
  );
}
