import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { advanceRecurringTask } from "./advanceRecurringTask";
import { actorOf, canComplete, canRead } from "../shared/taskPermissions";
type Raw = Record<string, unknown>;
// Marca ou desmarca uma subtarefa (só o campo "completed"). Marcar a última conclui
// a tarefa; numa recorrente, conclui pelo advanceRecurringTask, que cria a próxima.
export async function toggleSubtask(uid: string, taskId: string, subtaskId: string, completed?: boolean) {
  const userRef = db.doc(`users/${uid}`);
  const taskRef = db.doc(`tasks/${taskId}`);
  const advance = await db.runTransaction(async (tx) => {
    const [user, snap] = await Promise.all([tx.get(userRef), tx.get(taskRef)]);
    const task = snap.data();
    const actor = actorOf(uid, user.data());
    if (!task || !actor || !canRead(task, actor))
      throw new HttpsError("not-found", "Tarefa não encontrada.");
    if (!canComplete(task, actor))
      throw new HttpsError("permission-denied", "Sua conta não tem permissão para esta ação.");
    if (task.completed === true || task.skipped === true)
      throw new HttpsError("failed-precondition", "Esta tarefa já foi encerrada.");
    const list = (Array.isArray(task.subtasks) ? task.subtasks : []) as Raw[];
    const index = list.findIndex((item, i) => String(item?.id ?? i) === subtaskId);
    if (index < 0) throw new HttpsError("not-found", "Subtarefa não encontrada.");
    const subtasks = list.map((item, i) =>
      i === index ? { ...item, completed: completed ?? item.completed !== true } : item,
    );
    const valid = subtasks.filter((item) => typeof item?.title === "string" && item.title.trim());
    const allDone = valid.length > 0 && valid.every((item) => item.completed === true);
    if (allDone && (task.recurrence ?? "none") !== "none") return true;
    tx.update(taskRef, {
      subtasks,
      completed: allDone,
      lastModifiedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return false;
  });
  if (advance) return advanceRecurringTask(uid, taskId, "complete", subtaskId);
  return { nextTaskId: null, nextDueDate: null };
}
