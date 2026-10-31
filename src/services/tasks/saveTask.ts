import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { canCreatePrivateTask } from "../../middlewares/canCreatePrivateTask";
import { requireCanEditTask } from "../../middlewares/requireCanEditTask";
import { requireFamilyMember } from "../../middlewares/requireFamilyMember";
import type { Profile } from "../../models/Profile";
import type { Task } from "../../models/Task";
import type { TaskInput } from "../../models/TaskInput";
import { validateTaskInput } from "../../utils/validateTaskInput";
export async function saveTask(
  profile: Profile,
  input: TaskInput,
  existing?: Task,
) {
  requireFamilyMember(profile);
  validateTaskInput(input);
  if (input.isPrivate && !canCreatePrivateTask(profile))
    throw new Error("Somente administradores criam tarefas privadas.");
  const recurring = input.recurrence !== "none";
  const data = {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    // O Firestore não aceita undefined: campos opcionais vazios ficam nulos.
    subtasks: input.subtasks.map((item) => ({
      ...item,
      title: item.title.trim(),
      category: item.category || null,
      dueDate: item.dueDate || null,
      dueTime: item.dueTime || null,
    })),
    // Campos sem uso ficam nulos para não guardar regra antiga de recorrência.
    weekDays: input.recurrence === "custom_weekly" ? input.weekDays ?? [] : null,
    recurrenceInterval:
      input.recurrence === "interval" ? input.recurrenceInterval ?? null : null,
    recurrenceEndDate: recurring ? input.recurrenceEndDate || null : null,
    lastModifiedBy: profile.uid,
    updatedAt: serverTimestamp(),
  };
  if (existing) {
    requireCanEditTask(existing, profile);
    await updateDoc(doc(db, "tasks", existing.id), data);
  } else
    await addDoc(collection(db, "tasks"), {
      ...data,
      familyId: profile.familyId,
      createdBy: profile.uid,
      createdAt: serverTimestamp(),
      completed: false,
    });
}
