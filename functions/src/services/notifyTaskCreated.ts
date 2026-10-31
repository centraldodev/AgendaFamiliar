import { db } from "../config/firebase";
import { displayNameOf } from "./displayNameOf";
import { familyMemberIds } from "./familyMemberIds";
import { notifyUsers } from "./pushNotifications";
const shortDate = (date: unknown) =>
  typeof date === "string" ? date.split("-").reverse().slice(0, 2).join("/") : "";
// Tarefa pública nova: avisa os outros membros. Privadas e repetições não geram aviso.
export async function notifyTaskCreated(taskId: string, task: Record<string, unknown>) {
  // Próximas ocorrências de recorrentes não são "novas tarefas".
  if (task.isPrivate === true || task.previousOccurrenceId) return;
  if (typeof task.familyId !== "string") return;
  const authorId = String(task.createdBy ?? "");
  const [members, author] = await Promise.all([
    familyMemberIds(task.familyId),
    authorId ? db.doc(`users/${authorId}`).get() : null,
  ]);
  const name = author?.exists ? displayNameOf(author.data()) : "Alguém";
  const when = [shortDate(task.dueDate), task.dueTime].filter(Boolean).join(" ");
  await notifyUsers(
    members.filter((uid) => uid !== authorId),
    {
      title: "Nova tarefa na família",
      body: `${name} criou "${String(task.title ?? "")}"${when ? ` para ${when}` : ""}.`,
      data: { type: "task_created", taskId },
    },
  );
}
