import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
// Recorrentes: o backend arquiva a atual (concluída ou pulada) e cria a próxima.
// Também marca subtarefas ("toggleSubtask").
export async function advanceTask(
  taskId: string,
  action: "complete" | "skip" | "toggleSubtask",
  subtaskId?: string,
) {
  await httpsCallable(functions, "agendaTaskOccurrence")({ taskId, action, subtaskId });
}
