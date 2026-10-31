import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import { requireFamilyMember } from "../../middlewares/requireFamilyMember";
import { requireTaskOwner } from "../../middlewares/requireTaskOwner";
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
  const data = {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    lastModifiedBy: profile.uid,
    updatedAt: serverTimestamp(),
  };
  if (existing) {
    requireTaskOwner(existing);
    await updateDoc(doc(db, "tasks", existing.id), data);
  } else
    await addDoc(collection(db, "tasks"), {
      ...data,
      familyId: profile.familyId,
      userId: profile.uid,
      createdBy: profile.uid,
      createdAt: serverTimestamp(),
      completed: false,
      recurrence: "none",
      subtasks: [],
    });
}
