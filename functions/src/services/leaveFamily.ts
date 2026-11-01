import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { assertCanLeaveFamily } from "../middlewares/assertCanLeaveFamily";
import { displayNameOf } from "./displayNameOf";
import { recordHistory } from "./recordHistory";
export async function deleteAll(query: FirebaseFirestore.Query) {
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
// Tira a pessoa da família (sair do grupo ou excluir a conta).
// - Único membro: a família e todas as tarefas dela somem.
// - Com outros membros: as privadas da pessoa somem; as compartilhadas ficam
//   e deixam de ter a pessoa como responsável.
// O único admin de uma família com outros membros precisa promover alguém antes.
export async function departFamily(uid: string, familyId: string, clearProfile: boolean) {
  const userRef = db.doc(`users/${uid}`);
  const alone = await db.runTransaction(async (tx) => {
    const profile = (await tx.get(userRef)).data();
    await assertCanLeaveFamily(tx, uid, familyId);
    const members = await tx.get(db.collection("users").where("familyId", "==", familyId));
    if (members.size > 1)
      recordHistory(tx, familyId, { type: "member_left", actorId: uid, actorName: displayNameOf(profile) });
    if (clearProfile) tx.update(userRef, { familyId: FieldValue.delete(), role: FieldValue.delete() });
    return members.size <= 1;
  });
  const tasks = db.collection("tasks").where("familyId", "==", familyId);
  if (alone) {
    await deleteAll(tasks);
    await db.recursiveDelete(db.doc(`families/${familyId}`));
    return;
  }
  await deleteAll(tasks.where("createdBy", "==", uid).where("isPrivate", "==", true));
  const assigned = await tasks.where("assignedTo", "==", uid).get();
  const batch = db.batch();
  assigned.docs.forEach((doc) => batch.update(doc.ref, { assignedTo: null }));
  await batch.commit();
}
// Sair do grupo: a conta continua; a pessoa volta para a tela de criar ou entrar num grupo.
export async function leaveFamily(uid: string) {
  const profile = (await db.doc(`users/${uid}`).get()).data();
  const familyId = typeof profile?.familyId === "string" && profile.familyId ? profile.familyId : null;
  if (!familyId) throw new HttpsError("failed-precondition", "Você não está em nenhum grupo.");
  await departFamily(uid, familyId, true);
  return { left: true };
}
