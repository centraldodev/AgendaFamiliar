import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { User } from "firebase/auth";
import { auth, db, functions } from "./firebase";
import type { Profile, Family, Task, TaskInput } from "./types";
export async function loadProfile(user: User): Promise<Profile> {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return snapshot.data() as Profile;
  const profile = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}
export async function loadFamily(id: string): Promise<Family> {
  const snapshot = await getDoc(doc(db, "families", id));
  if (!snapshot.exists()) throw new Error("Família não encontrada.");
  return { ...snapshot.data(), id } as Family;
}
export async function familyAction(action: "create" | "join", value: string) {
  await httpsCallable(functions, "agendaSimpleFamily")({ action, value });
}
export async function loadTasks(): Promise<Task[]> {
  const result = await httpsCallable<unknown, { tasks: Task[] }>(
    functions,
    "agendaSimpleTasks",
  )({});
  return result.data.tasks.sort((a, b) =>
    `${a.dueDate} ${a.dueTime ?? ""}`.localeCompare(
      `${b.dueDate} ${b.dueTime ?? ""}`,
    ),
  );
}
export async function saveTask(
  profile: Profile,
  input: TaskInput,
  existing?: Task,
) {
  if (!profile.familyId || auth.currentUser?.uid !== profile.uid)
    throw new Error("Entre em uma família.");
  const data = {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    lastModifiedBy: profile.uid,
    updatedAt: serverTimestamp(),
  };
  if (existing) {
    if (existing.createdBy !== profile.uid)
      throw new Error("Somente o criador altera os detalhes.");
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
export async function toggleTask(task: Task) {
  await updateDoc(doc(db, "tasks", task.id), {
    completed: !task.completed,
    lastModifiedBy: auth.currentUser!.uid,
    updatedAt: serverTimestamp(),
  });
}
