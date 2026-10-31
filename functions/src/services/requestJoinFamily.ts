import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { assertCanLeaveFamily } from "../middlewares/assertCanLeaveFamily";
import { displayNameOf } from "./displayNameOf";
import { assertJoinCodeAllowed, recordJoinCodeFailure } from "./joinCodeLimit";
import { notifyFamilyAdmins } from "./pushNotifications";
import { recordHistory } from "./recordHistory";
// Entrar (ou trocar de grupo) só cria uma solicitação; um administrador decide.
export async function requestJoinFamily(
  uid: string,
  identity: { email: string; name: string },
  value: string,
) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code))
    throw new HttpsError("invalid-argument", "Código inválido.");
  await assertJoinCodeAllowed(uid);
  const userRef = db.doc(`users/${uid}`);
  const requestRef = db.doc(`joinRequests/${uid}`);
  const cooldownMs = 2 * 60 * 1000;
  const result = await db.runTransaction(async (tx) => {
    const profile = await tx.get(userRef);
    const current = await tx.get(requestRef);
    const found = await tx.get(
      db.collection("families").where("code", "==", code).limit(1),
    );
    if (found.empty) throw new HttpsError("not-found", "Família não encontrada.");
    const family = found.docs[0];
    const currentFamilyId = profile.data()?.familyId as string | undefined;
    if (currentFamilyId === family.id)
      throw new HttpsError("failed-precondition", "Você já está neste grupo.");
    if (currentFamilyId) await assertCanLeaveFamily(tx, uid, currentFamilyId);
    const name = displayNameOf({
      displayName: profile.data()?.displayName ?? identity.name,
      email: identity.email,
    });
    const previousAt = Date.parse(String(current.data()?.createdAt ?? ""));
    if (
      current.data()?.status !== "pending" &&
      Date.now() - previousAt < cooldownMs
    )
      throw new HttpsError(
        "resource-exhausted",
        "Aguarde alguns minutos antes de enviar outra solicitação.",
      );
    const alreadyPending =
      current.data()?.status === "pending" &&
      current.data()?.familyId === family.id;
    if (!alreadyPending) {
      tx.set(requestRef, {
        userId: uid,
        familyId: family.id,
        familyName: String(family.data().name ?? ""),
        displayName: name,
        email: identity.email,
        previousFamilyId: currentFamilyId ?? null,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      recordHistory(tx, family.id, {
        type: "join_requested",
        actorId: uid,
        actorName: name,
        targetId: uid,
        targetName: name,
      });
    }
    return {
      familyId: family.id,
      familyName: String(family.data().name ?? ""),
      name,
      notify: !alreadyPending,
    };
  }).catch(async (error) => {
    if (error instanceof HttpsError && error.code === "not-found")
      await recordJoinCodeFailure(uid);
    throw error;
  });
  if (result.notify)
    await notifyFamilyAdmins(result.familyId, {
      title: "Nova solicitação de entrada",
      body: `${result.name} quer entrar em ${result.familyName}.`,
      data: { type: "join_request", requestId: uid, familyId: result.familyId },
      categoryId: "join_request",
    });
  return { status: "pending", familyName: result.familyName };
}
