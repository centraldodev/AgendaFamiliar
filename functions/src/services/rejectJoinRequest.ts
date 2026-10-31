import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { requireFamilyAdmin } from "../middlewares/requireFamilyAdmin";
import { displayNameOf } from "./displayNameOf";
import { notifyUsers } from "./pushNotifications";
import { recordHistory } from "./recordHistory";
export async function rejectJoinRequest(adminUid: string, requestId: string) {
  const adminRef = db.doc(`users/${adminUid}`);
  const requestRef = db.doc(`joinRequests/${requestId}`);
  const familyName = await db.runTransaction(async (tx) => {
    const admin = await tx.get(adminRef);
    const request = await tx.get(requestRef);
    const data = request.data();
    // Permissão primeiro: quem não administra o grupo nada descobre sobre o pedido.
    const familyId = requireFamilyAdmin(admin.data());
    if (!data || data.familyId !== familyId)
      throw new HttpsError("not-found", "Solicitação não encontrada.");
    if (data.status !== "pending")
      throw new HttpsError(
        "failed-precondition",
        "Esta solicitação não está mais pendente.",
      );
    const adminName = displayNameOf(admin.data());
    tx.update(requestRef, {
      status: "rejected",
      decidedBy: adminUid,
      decidedByName: adminName,
      decidedAt: new Date().toISOString(),
    });
    recordHistory(tx, familyId, {
      type: "join_rejected",
      actorId: adminUid,
      actorName: adminName,
      targetId: requestId,
      targetName: data.displayName,
    });
    return String(data.familyName ?? "");
  });
  await notifyUsers([requestId], {
    title: "Solicitação recusada",
    body: `Sua entrada em ${familyName} não foi aprovada.`,
    data: { type: "join_decision", decision: "rejected" },
  });
  return { status: "rejected" };
}
