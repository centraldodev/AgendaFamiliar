import { getAuth } from "firebase-admin/auth";
import { db } from "../config/firebase";
import { tokenCollection } from "../api/authenticate";
import { assertCanLeaveFamily } from "../middlewares/assertCanLeaveFamily";
import { displayNameOf } from "./displayNameOf";
import { recordHistory } from "./recordHistory";
async function deleteAll(query: FirebaseFirestore.Query) {
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
// Exclui a conta e os dados pessoais (exigência da Play Store).
// - Único membro: a família e todas as tarefas dela somem.
// - Com outros membros: as privadas da pessoa somem; as compartilhadas ficam
//   (autor aparece como "Ex-membro") e deixam de ter a pessoa como responsável.
// O único admin de uma família com outros membros precisa promover alguém antes.
export async function deleteAccount(uid: string) {
  const userRef = db.doc(`users/${uid}`);
  const profile = (await userRef.get()).data();
  const familyId = typeof profile?.familyId === "string" && profile.familyId ? profile.familyId : null;
  if (familyId) {
    const alone = await db.runTransaction(async (tx) => {
      await assertCanLeaveFamily(tx, uid, familyId);
      const members = await tx.get(db.collection("users").where("familyId", "==", familyId));
      if (members.size > 1)
        recordHistory(tx, familyId, { type: "member_left", actorId: uid, actorName: displayNameOf(profile) });
      return members.size <= 1;
    });
    const tasks = db.collection("tasks").where("familyId", "==", familyId);
    if (alone) {
      await deleteAll(tasks);
      await db.recursiveDelete(db.doc(`families/${familyId}`));
    } else {
      await deleteAll(tasks.where("createdBy", "==", uid).where("isPrivate", "==", true));
      const assigned = await tasks.where("assignedTo", "==", uid).get();
      const batch = db.batch();
      assigned.docs.forEach((doc) => batch.update(doc.ref, { assignedTo: null }));
      await batch.commit();
    }
  }
  await deleteAll(db.collection(tokenCollection).where("uid", "==", uid));
  await Promise.all([
    db.doc(`joinRequests/${uid}`).delete(),
    db.doc(`rateLimits/${uid}`).delete(),
    db.recursiveDelete(userRef),
  ]);
  await getAuth().deleteUser(uid).catch((error) => {
    if (error?.code !== "auth/user-not-found") throw error;
  });
  return { deleted: true };
}
