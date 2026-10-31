import { db } from "../config/firebase";
import { displayNameOf } from "./displayNameOf";
import { notifyUsers } from "./pushNotifications";
// Avisa quem passou a ser responsável (menos quando a pessoa escolheu a si mesma).
export async function notifyTaskAssigned(taskId: string, task: Record<string, unknown>, byUid: string) {
  const assignee = task.assignedTo;
  if (typeof assignee !== "string" || !assignee || assignee === byUid) return;
  const by = byUid ? await db.doc(`users/${byUid}`).get() : null;
  const name = by?.exists ? displayNameOf(by.data()) : "Alguém";
  await notifyUsers([assignee], {
    title: "Tarefa para você",
    body: `${name} deixou "${String(task.title ?? "")}" com você.`,
    data: { type: "task_assigned", taskId },
  });
}
