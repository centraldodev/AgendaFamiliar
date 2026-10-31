import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { canReadTask } from "../middlewares/canReadTask";
export async function handleListTasks(request: CallableRequest) {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Entre na sua conta.");
  const uid = request.auth.uid;
  const profile = await db.doc(`users/${uid}`).get();
  const familyId = profile.data()?.familyId;
  if (typeof familyId !== "string" || !familyId)
    throw new HttpsError("failed-precondition", "Entre em uma família.");
  const docs = await db
    .collection("tasks")
    .where("familyId", "==", familyId)
    .get();
  return {
    tasks: docs.docs.flatMap((doc) => {
      const t = doc.data();
      if (!canReadTask(t, uid, familyId)) return [];
      return [
        {
          id: doc.id,
          title: t.title ?? "",
          description: t.description ?? "",
          dueDate: t.dueDate ?? "",
          dueTime: t.dueTime ?? null,
          category: t.category ?? "",
          completed: t.completed === true,
          familyId,
          createdBy: t.createdBy ?? t.userId ?? "",
          isPrivate: t.isPrivate === true,
          recurrence: t.recurrence ?? "none",
          subtasks: t.subtasks ?? [],
        },
      ];
    }),
  };
}
