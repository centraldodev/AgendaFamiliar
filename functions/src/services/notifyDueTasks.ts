import { db } from "../config/firebase";
import { isReminderDue, leadMinutesOf, localParts, reminderKey } from "./dueReminder";
import { notifyUsers } from "./pushNotifications";
type Recipient = { uid: string; lead: number };
const leadText = (lead: number) =>
  lead >= 1440 ? "amanhã" : lead >= 60 ? `em ${lead / 60} h` : `em ${lead} min`;
// Lê o estado atual das tarefas a cada execução: excluídas, concluídas ou com a
// data alterada nunca recebem aviso antigo. Cada pessoa escolhe a antecedência
// (users.reminderMinutes); "dueReminders/{taskId}_{uid}" guarda a ocorrência já avisada.
export async function notifyDueTasks(now: Date = new Date()) {
  const day = 24 * 60 * 60 * 1000;
  const dates = [-1, 0, 1].map((offset) => localParts(new Date(now.getTime() + offset * day)).date);
  const snapshot = await db.collection("tasks").where("dueDate", "in", dates).get();
  const pending = snapshot.docs.filter((doc) => doc.data().completed !== true && doc.data().skipped !== true);
  const families = new Map<string, Promise<Recipient[]>>();
  const membersOf = (familyId: string) => {
    if (!families.has(familyId))
      families.set(
        familyId,
        db.collection("users").where("familyId", "==", familyId).get()
          .then((snap) => snap.docs.map((doc) => ({ uid: doc.id, lead: leadMinutesOf(doc.data()) }))),
      );
    return families.get(familyId)!;
  };
  let sent = 0;
  for (const doc of pending) {
    const task = doc.data();
    if (typeof task.familyId !== "string") continue;
    // Pública: toda a família. Privada: somente quem criou.
    const members = await membersOf(task.familyId);
    const recipients = task.isPrivate === true ? members.filter((m) => m.uid === task.createdBy) : members;
    const key = reminderKey(task);
    for (const { uid, lead } of recipients) {
      if (!isReminderDue(task, now, lead)) continue;
      const marker = db.doc(`dueReminders/${doc.id}_${uid}`);
      // Marca antes de enviar, em transação, para duas execuções não avisarem em dobro.
      const claimed = await db.runTransaction(async (tx) => {
        const previous = await tx.get(marker);
        if (previous.data()?.key === key) return false;
        tx.set(marker, { key, familyId: task.familyId, at: now.toISOString() });
        return true;
      });
      if (!claimed) continue;
      const when = lead > 0 ? leadText(lead) : task.dueTime ? "agora" : "hoje";
      await notifyUsers([uid], {
        title: lead > 0 ? `Tarefa ${when}` : task.dueTime ? "Tarefa vencendo agora" : "Tarefa vence hoje",
        body: `${String(task.title ?? "Tarefa")}${task.dueTime ? ` · ${task.dueTime}` : ""}`,
        data: { type: "task_due", taskId: doc.id },
      });
      sent++;
    }
  }
  return { checked: snapshot.size, sent };
}
