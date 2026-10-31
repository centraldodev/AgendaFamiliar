import { randomBytes } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { recordHistory } from "./recordHistory";
import { displayNameOf } from "./displayNameOf";
export async function createFamily(
  uid: string,
  identity: { email: string; name: string },
  name: string,
) {
  const userRef = db.doc(`users/${uid}`);
  const requestRef = db.doc(`joinRequests/${uid}`);
  return db.runTransaction(async (tx) => {
    const profile = await tx.get(userRef);
    const request = await tx.get(requestRef);
    if (profile.data()?.familyId)
      throw new HttpsError(
        "failed-precondition",
        "Você já pertence a uma família.",
      );
    const familyRef = db.collection("families").doc();
    const data = {
      uid,
      email: identity.email,
      displayName: profile.data()?.displayName ?? identity.name,
    };
    tx.create(familyRef, {
      name,
      code: randomBytes(6).toString("hex").toUpperCase(),
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });
    // O criador é o primeiro administrador; solicitações antigas deixam de valer.
    tx.set(userRef, { ...data, familyId: familyRef.id, role: "admin" }, { merge: true });
    if (request.data()?.status === "pending") tx.delete(requestRef);
    recordHistory(tx, familyRef.id, {
      type: "family_created",
      actorId: uid,
      actorName: displayNameOf(data),
      role: "admin",
    });
    return { familyId: familyRef.id };
  });
}
