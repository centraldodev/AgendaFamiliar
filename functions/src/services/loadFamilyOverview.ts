import { db } from "../config/firebase";
import { normalizeRole } from "../shared/roles";
// Perfis são privados no Firestore; membros e histórico só saem por aqui.
export async function loadFamilyOverview(uid: string) {
  const [profileSnap, requestSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`joinRequests/${uid}`).get(),
  ]);
  const profile = profileSnap.data();
  const request = requestSnap.data();
  const myRequest =
    request?.status === "pending"
      ? {
          familyId: String(request.familyId),
          familyName: String(request.familyName ?? ""),
          createdAt: String(request.createdAt ?? ""),
        }
      : null;
  const familyId = profile?.familyId;
  if (typeof familyId !== "string" || !familyId)
    return { familyId: null, role: null, members: [], pending: [], history: [], myRequest };
  const role = normalizeRole(profile?.role);
  const isAdmin = role === "admin";
  const members = await db
    .collection("users")
    .where("familyId", "==", familyId)
    .get();
  const [pending, history] = isAdmin
    ? await Promise.all([
        db
          .collection("joinRequests")
          .where("familyId", "==", familyId)
          .where("status", "==", "pending")
          .get(),
        db
          .collection(`families/${familyId}/history`)
          .orderBy("at", "desc")
          .limit(50)
          .get(),
      ])
    : [null, null];
  return {
    familyId,
    role,
    myRequest,
    members: members.docs
      .map((doc) => ({
        uid: doc.id,
        displayName: String(doc.data().displayName ?? ""),
        email: isAdmin || doc.id === uid ? String(doc.data().email ?? "") : "",
        role: normalizeRole(doc.data().role),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    pending:
      pending?.docs
        .map((doc) => ({
          requestId: doc.id,
          userId: String(doc.data().userId),
          displayName: String(doc.data().displayName ?? ""),
          email: String(doc.data().email ?? ""),
          createdAt: String(doc.data().createdAt ?? ""),
          switching: !!doc.data().previousFamilyId,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)) ?? [],
    history:
      history?.docs.map((doc) => ({ id: doc.id, ...doc.data() })) ?? [],
  };
}
