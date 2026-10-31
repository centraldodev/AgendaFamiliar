import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { requireAuth } from "../middlewares/requireAuth";
import { advanceRecurringTask } from "../services/advanceRecurringTask";
import { toggleSubtask } from "../services/toggleSubtask";
export async function handleTaskOccurrence(request: CallableRequest) {
  const uid = requireAuth(request);
  const { taskId, action, subtaskId } = request.data ?? {};
  if (typeof taskId !== "string" || !taskId || taskId.length > 128)
    throw new HttpsError("invalid-argument", "Tarefa inválida.");
  if (action !== "complete" && action !== "skip" && action !== "toggleSubtask")
    throw new HttpsError("invalid-argument", "Ação desconhecida.");
  if (subtaskId !== undefined && (typeof subtaskId !== "string" || subtaskId.length > 128))
    throw new HttpsError("invalid-argument", "Subtarefa inválida.");
  if (action === "toggleSubtask") {
    if (!subtaskId) throw new HttpsError("invalid-argument", "Subtarefa inválida.");
    return toggleSubtask(uid, taskId, subtaskId);
  }
  return advanceRecurringTask(uid, taskId, action, subtaskId);
}
