import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { requireAuthenticatedUser } from "../../middlewares/requireAuthenticatedUser";
import type { Task } from "../../models/Task";
import { advanceTask } from "./advanceTask";
// Concluir (recorrente: pelo backend, que cria a próxima) ou restaurar uma
// concluída ou pulada.
export async function toggleTask(task: Task) {
  const meta = {
    lastModifiedBy: requireAuthenticatedUser().uid,
    updatedAt: serverTimestamp(),
  };
  const ref = doc(db, "tasks", task.id);
  if (task.completed || task.skipped)
    await updateDoc(ref, { completed: false, skipped: false, ...meta });
  else if (task.recurrence && task.recurrence !== "none")
    await advanceTask(task.id, "complete");
  else await updateDoc(ref, { completed: true, ...meta });
}
