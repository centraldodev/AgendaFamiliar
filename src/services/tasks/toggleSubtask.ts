import type { Task } from "../../models/Task";
import { advanceTask } from "./advanceTask";
// O backend marca a subtarefa (as regras não deixam o app reescrever a lista).
// Marcar a última conclui a tarefa; numa recorrente, cria a próxima.
export async function toggleSubtask(task: Task, subtaskId: string) {
  await advanceTask(task.id, "toggleSubtask", subtaskId);
}
