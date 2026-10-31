import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { actorOf, canComplete, canRead } from "../shared/taskPermissions";
import { localParts } from "./dueReminder";
import { nextOccurrence } from "../shared/nextOccurrence";
type Raw = Record<string, unknown>;
const dayMs = 24 * 60 * 60 * 1000;
const toDay = (date: string) =>
  Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const shift = (date: string, days: number) =>
  new Date(toDay(date) + days * dayMs).toISOString().slice(0, 10);
// Concluir ou pular uma recorrente: a atual é arquivada (concluída ou pulada) e
// uma nova é criada na próxima data, com o mesmo autor, subtarefas desmarcadas e
// datas das subtarefas deslocadas. Passada a data final, só arquiva.
export async function advanceRecurringTask(
  uid: string,
  taskId: string,
  action: "complete" | "skip",
  subtaskId?: string,
) {
  const userRef = db.doc(`users/${uid}`);
  const taskRef = db.doc(`tasks/${taskId}`);
  return db.runTransaction(async (tx) => {
    const [user, snap] = await Promise.all([tx.get(userRef), tx.get(taskRef)]);
    const task = snap.data();
    const actor = actorOf(uid, user.data());
    if (!task || !actor || !canRead(task, actor))
      throw new HttpsError("not-found", "Tarefa não encontrada.");
    if (!canComplete(task, actor))
      throw new HttpsError("permission-denied", "Sua conta não tem permissão para esta ação.");
    if (task.completed === true || task.skipped === true)
      throw new HttpsError("failed-precondition", "Esta tarefa já foi encerrada.");
    if ((task.recurrence ?? "none") === "none")
      throw new HttpsError("failed-precondition", "Esta tarefa não se repete.");
    const subtasks = (Array.isArray(task.subtasks) ? task.subtasks : []).map(
      (item: Raw, index: number) =>
        subtaskId !== undefined && String(item?.id ?? index) === subtaskId
          ? { ...item, completed: true }
          : item,
    );
    const meta = { lastModifiedBy: uid, updatedAt: FieldValue.serverTimestamp() };
    tx.update(taskRef, {
      ...(action === "complete" ? { completed: true } : { skipped: true }),
      ...(Array.isArray(task.subtasks) ? { subtasks } : {}),
      ...meta,
    });
    const next =
      typeof task.dueDate === "string"
        ? nextOccurrence(task.dueDate, task, localParts(new Date()).date)
        : null;
    if (!next) return { nextTaskId: null, nextDueDate: null };
    const days = Math.round((toDay(next) - toDay(task.dueDate)) / dayMs);
    const nextRef = db.collection("tasks").doc();
    // A nova herda tudo da atual, exceto estado e datas de registro.
    const copy: Raw = { ...task };
    for (const key of ["completed", "skipped", "userId", "createdAt", "updatedAt"])
      delete copy[key];
    tx.create(nextRef, {
      ...copy,
      dueDate: next,
      completed: false,
      subtasks: subtasks.map((item: Raw) => ({
        ...item,
        completed: false,
        ...(typeof item.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)
          ? { dueDate: shift(item.dueDate, days) }
          : {}),
      })),
      // Marca a origem: o aviso de "nova tarefa" ignora repetições.
      previousOccurrenceId: taskId,
      createdAt: FieldValue.serverTimestamp(),
      ...meta,
    });
    return { nextTaskId: nextRef.id, nextDueDate: next };
  });
}
