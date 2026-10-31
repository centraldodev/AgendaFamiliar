import { collection, onSnapshot, query, where, type QuerySnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { isExpiredCompletedTask } from "../../../functions/src/shared/isExpiredCompletedTask.ts";
import { serializeTask } from "../../../functions/src/shared/serializeTask.ts";
import type { Task } from "../../models/Task";
// Tarefas da família em tempo real. As regras só liberam consultas que fixam os
// campos que elas checam: por isso são duas (compartilhadas + as minhas).
export function subscribeTasks(
  uid: string,
  familyId: string,
  names: () => Map<string, string>,
  onData: (tasks: Task[]) => void,
  onError: (error: unknown) => void,
) {
  const tasks = collection(db, "tasks");
  const parts: (QuerySnapshot | null)[] = [null, null];
  const emit = () => {
    if (parts.some((part) => !part)) return;
    const byId = new Map<string, Task>();
    for (const part of parts)
      for (const doc of part!.docs)
        if (!isExpiredCompletedTask(doc.data()))
          byId.set(doc.id, serializeTask(doc.id, doc.data(), names()) as Task);
    onData([...byId.values()]);
  };
  const listen = (index: number, q: ReturnType<typeof query>) =>
    onSnapshot(
      q,
      (snapshot) => {
        parts[index] = snapshot as QuerySnapshot;
        emit();
      },
      onError,
    );
  const stops = [
    listen(0, query(tasks, where("familyId", "==", familyId), where("isPrivate", "==", false))),
    listen(1, query(tasks, where("familyId", "==", familyId), where("createdBy", "==", uid))),
  ];
  // Reemite com nomes atualizados (ex.: lista de membros chegou depois).
  return { stop: () => stops.forEach((stop) => stop()), reemit: emit };
}
