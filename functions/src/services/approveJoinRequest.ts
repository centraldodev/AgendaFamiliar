import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import type { FamilyRole } from "../shared/roles";
import { assertCanLeaveFamily } from "../middlewares/assertCanLeaveFamily";
import { requireFamilyAdmin } from "../middlewares/requireFamilyAdmin";
import { displayNameOf } from "./displayNameOf";
import { notifyUsers } from "./pushNotifications";
import { recordHistory } from "./recordHistory";
export async function approveJoinRequest(
  adminUid: string,
  requestId: string,
  role: FamilyRole,
) {
  const adminRef = db.doc(`users/${adminUid}`);
  const requestRef = db.doc(`joinRequests/${requestId}`);
  const userRef = db.doc(`users/${requestId}`);
  const result = await db.runTransaction(async (tx) => {
    const admin = await tx.get(adminRef);
    const request = await tx.get(requestRef);
    const user = await tx.get(userRef);
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
    const previousFamilyId = user.data()?.familyId as string | undefined;
    if (previousFamilyId && previousFamilyId !== familyId)
      await assertCanLeaveFamily(tx, requestId, previousFamilyId);
    const adminName = displayNameOf(admin.data());
    const userName = displayNameOf({ ...user.data(), ...data });
    const at = new Date().toISOString();
    if (previousFamilyId && previousFamilyId !== familyId)
      recordHistory(tx, previousFamilyId, {
        type: "member_left",
        actorId: requestId,
        actorName: userName,
        targetId: requestId,
        targetName: userName,
      });
    tx.set(userRef, { familyId, role }, { merge: true });
    tx.update(requestRef, {
      status: "approved",
      decidedBy: adminUid,
      decidedByName: adminName,
      decidedAt: at,
      grantedRole: role,
    });
    recordHistory(tx, familyId, {
      type: "join_approved",
      actorId: adminUid,
      actorName: adminName,
      targetId: requestId,
      targetName: userName,
      role,
    });
    return { familyName: String(data.familyName ?? "") };
  });
  await notifyUsers([requestId], {
    title: "Solicitação aprovada",
    body: `Você agora faz parte de ${result.familyName}.`,
    data: { type: "join_decision", decision: "approved" },
  });
  return { status: "approved" };
}
