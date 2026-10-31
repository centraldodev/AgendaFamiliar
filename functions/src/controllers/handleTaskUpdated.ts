import type { Change, FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { notifyTaskAssigned } from "../services/notifyTaskAssigned";
// Responsável trocado numa edição: avisa o novo responsável.
export async function handleTaskUpdated(
  event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { taskId: string }>,
) {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.assignedTo === after.assignedTo) return;
  await notifyTaskAssigned(event.params.taskId, after, String(after.lastModifiedBy ?? ""));
}
