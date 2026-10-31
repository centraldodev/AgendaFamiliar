import { db } from "../config/firebase";
import { recordHistory } from "./recordHistory";
export async function cancelJoinRequest(uid: string) {
  const requestRef = db.doc(`joinRequests/${uid}`);
  await db.runTransaction(async (tx) => {
    const request = await tx.get(requestRef);
    const data = request.data();
    if (data?.status !== "pending") return;
    tx.update(requestRef, {
      status: "cancelled",
      decidedAt: new Date().toISOString(),
    });
    recordHistory(tx, data.familyId, {
      type: "join_cancelled",
      actorId: uid,
      actorName: data.displayName,
      targetId: uid,
      targetName: data.displayName,
    });
  });
  return { status: "cancelled" };
}
