import { db } from "../config/firebase";
import { isReminderDue, localParts, reminderKey } from "./dueReminder";
import { familyMemberIds } from "./familyMemberIds";
import { notifyUsers } from "./pushNotifications";
// Lê o estado atual das tarefas a cada execução: excluídas, concluídas ou com a
// data alterada nunca recebem aviso antigo. "dueReminders/{taskId}" guarda a
// ocorrência já avisada para não repetir.
export async function notifyDueTasks(now: Date = new Date()) {
  const today = localParts(now).date;
  const yesterday = localParts(new Date(now.getTime() - 24 * 60 * 60 * 1000)).date;
  const snapshot = await db
    .collection("tasks")
    .where("dueDate", "in", [yesterday, today])
    .get();
  const due = snapshot.docs.filter((doc) => isReminderDue(doc.data(), now));
  const membersByFamily = new Map<string, Promise<string[]>>();
  let sent = 0;
  for (const doc of due) {
    const task = doc.data();
    const key = reminderKey(task);
    const marker = db.doc(`dueReminders/${doc.id}`);
    // Marca antes de enviar, em transação, para duas execuções não avisarem em dobro.
    const claimed = await db.runTransaction(async (tx) => {
      const previous = await tx.get(marker);
      if (previous.data()?.key === key) return false;
      tx.set(marker, { key, familyId: task.familyId, at: now.toISOString() });
      return true;
    });
    if (!claimed || typeof task.familyId !== "string") continue;
    // Pública: toda a família. Privada: somente quem criou.
    let recipients: string[];
    if (task.isPrivate === true) recipients = [String(task.createdBy ?? "")];
    else {
      if (!membersByFamily.has(task.familyId))
        membersByFamily.set(task.familyId, familyMemberIds(task.familyId));
      recipients = await membersByFamily.get(task.familyId)!;
    }
    await notifyUsers(recipients.filter(Boolean), {
      title: task.dueTime ? "Tarefa vencendo agora" : "Tarefa vence hoje",
      body: `${String(task.title ?? "Tarefa")}${task.dueTime ? ` · ${task.dueTime}` : ""}`,
      data: { type: "task_due", taskId: doc.id },
    });
    sent++;
  }
  return { checked: snapshot.size, sent };
}
