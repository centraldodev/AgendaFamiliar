import type { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { notifyTaskCreated } from "../services/notifyTaskCreated";
export async function handleTaskCreated(
  event: FirestoreEvent<QueryDocumentSnapshot | undefined, { taskId: string }>,
) {
  const data = event.data?.data();
  if (data) await notifyTaskCreated(event.params.taskId, data);
}
