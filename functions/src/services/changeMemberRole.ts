import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { normalizeRole, type FamilyRole } from "../shared/roles";
import { requireFamilyAdmin } from "../middlewares/requireFamilyAdmin";
import { displayNameOf } from "./displayNameOf";
import { recordHistory } from "./recordHistory";
export async function changeMemberRole(
  adminUid: string,
  targetUid: string,
  role: FamilyRole,
) {
  const adminRef = db.doc(`users/${adminUid}`);
  const targetRef = db.doc(`users/${targetUid}`);
  await db.runTransaction(async (tx) => {
    const admin = await tx.get(adminRef);
    const target = await tx.get(targetRef);
    const familyId = requireFamilyAdmin(admin.data());
    if (target.data()?.familyId !== familyId)
      throw new HttpsError("not-found", "Membro não encontrado no seu grupo.");
    const fromRole = normalizeRole(target.data()?.role);
    if (fromRole === role) return;
    if (fromRole === "admin") {
      const admins = await tx.get(
        db
          .collection("users")
          .where("familyId", "==", familyId)
          .where("role", "==", "admin"),
      );
      if (admins.size <= 1)
        throw new HttpsError(
          "failed-precondition",
          "O grupo precisa ter pelo menos um administrador.",
        );
    }
    tx.update(targetRef, { role });
    recordHistory(tx, familyId, {
      type: "role_changed",
      actorId: adminUid,
      actorName: displayNameOf(admin.data()),
      targetId: targetUid,
      targetName: displayNameOf(target.data()),
      fromRole,
      toRole: role,
    });
  });
  return { role };
}
