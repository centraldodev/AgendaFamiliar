import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { canDeleteTask } from "../../middlewares/canDeleteTask";
import { requireFamilyMember } from "../../middlewares/requireFamilyMember";
import type { Profile } from "../../models/Profile";
import type { Task } from "../../models/Task";
export async function deleteTask(profile: Profile, task: Task) {
  requireFamilyMember(profile);
  if (!canDeleteTask(task, profile))
    throw new Error("Somente administradores excluem tarefas.");
  await deleteDoc(doc(db, "tasks", task.id));
}
