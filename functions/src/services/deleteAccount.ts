import { getAuth } from "firebase-admin/auth";
import { db } from "../config/firebase";
import { unlinkAll } from "../oauth/grants";
import { departFamily } from "./leaveFamily";
// Exclui a conta e os dados pessoais (exigência da Play Store).
// - Único membro: a família e todas as tarefas dela somem.
// - Com outros membros: as privadas da pessoa somem; as compartilhadas ficam
//   (autor aparece como "Ex-membro") e deixam de ter a pessoa como responsável.
// O único admin de uma família com outros membros precisa promover alguém antes.
export async function deleteAccount(uid: string) {
  const userRef = db.doc(`users/${uid}`);
  const profile = (await userRef.get()).data();
  const familyId = typeof profile?.familyId === "string" && profile.familyId ? profile.familyId : null;
  if (familyId) await departFamily(uid, familyId, false);
  await unlinkAll(uid);
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
