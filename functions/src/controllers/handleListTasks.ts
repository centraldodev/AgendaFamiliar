import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { canReadTask } from "../middlewares/canReadTask";
import { isExpiredCompletedTask } from "../middlewares/isExpiredCompletedTask";
import { resolveAuthorNames, serializeTask } from "../services/serializeTask";
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
  // Concluídas há mais de uma semana saem da lista; a limpeza diária (agendaCleanup) as apaga.
  const visible = docs.docs.filter(
    (doc) => !isExpiredCompletedTask(doc.data()) && canReadTask(doc.data(), uid, familyId),
  );
  const names = await resolveAuthorNames(visible.map((doc) => doc.data()));
  return { tasks: visible.map((doc) => serializeTask(doc.id, doc.data(), names)) };
}
