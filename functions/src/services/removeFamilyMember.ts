import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { requireFamilyAdmin } from "../middlewares/requireFamilyAdmin";
import { displayNameOf } from "./displayNameOf";
import { notifyUsers } from "./pushNotifications";
import { recordHistory } from "./recordHistory";
export async function removeFamilyMember(adminUid: string, targetUid: string) {
  if (adminUid === targetUid)
    throw new HttpsError(
      "invalid-argument",
      "Para sair do grupo, use \"Sair do grupo\" nas Configurações.",
    );
  const adminRef = db.doc(`users/${adminUid}`);
  const targetRef = db.doc(`users/${targetUid}`);
  const familyName = await db.runTransaction(async (tx) => {
    const admin = await tx.get(adminRef);
    const target = await tx.get(targetRef);
    const familyId = requireFamilyAdmin(admin.data());
    const family = await tx.get(db.doc(`families/${familyId}`));
    if (target.data()?.familyId !== familyId)
      throw new HttpsError("not-found", "Membro não encontrado no seu grupo.");
    tx.update(targetRef, {
      familyId: FieldValue.delete(),
      role: FieldValue.delete(),
    });
    recordHistory(tx, familyId, {
      type: "member_removed",
      actorId: adminUid,
      actorName: displayNameOf(admin.data()),
      targetId: targetUid,
      targetName: displayNameOf(target.data()),
    });
    return String(family.data()?.name ?? "");
  });
  await notifyUsers([targetUid], {
    title: "Você saiu do grupo",
    body: `Um administrador removeu você de ${familyName}.`,
    data: { type: "member_removed" },
  });
  return { removed: true };
}
