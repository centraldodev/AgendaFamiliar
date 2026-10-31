import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { completedRetentionMs } from "../shared/isExpiredCompletedTask";
// Concluídas ou puladas há mais de uma semana são apagadas uma vez por dia
// (antes era a cada listagem, o que fazia toda leitura gravar no banco).
export async function cleanupExpiredTasks(now: number = Date.now()) {
  const cutoff = Timestamp.fromMillis(now - completedRetentionMs);
  let deleted = 0;
  for (const field of ["completed", "skipped"] as const) {
    for (;;) {
      const snap = await db
        .collection("tasks")
        .where(field, "==", true)
        .where("updatedAt", "<", cutoff)
        .limit(400)
        .get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snap.size;
      if (snap.size < 400) break;
    }
  }
  return { deleted };
}
