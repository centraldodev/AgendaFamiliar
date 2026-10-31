import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { requireAuthenticatedUser } from "../../middlewares/requireAuthenticatedUser";
import type { Task } from "../../models/Task";
export async function toggleTask(task: Task) {
  await updateDoc(doc(db, "tasks", task.id), {
    completed: !task.completed,
    lastModifiedBy: requireAuthenticatedUser().uid,
    updatedAt: serverTimestamp(),
  });
}
