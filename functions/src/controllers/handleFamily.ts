import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { randomBytes } from "node:crypto";
export async function handleFamily(request: CallableRequest) {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Entre na sua conta.");
  const uid = request.auth.uid;
  const { action, value } = request.data ?? {};
  if (
    !["create", "join"].includes(action) ||
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 80
  )
    throw new HttpsError(
      "invalid-argument",
      "Informe o nome ou código da família.",
    );
  const userRef = db.doc(`users/${uid}`);
  return db.runTransaction(async (tx) => {
    const profile = await tx.get(userRef);
    if (profile.data()?.familyId)
      throw new HttpsError(
        "failed-precondition",
        "Você já pertence a uma família.",
      );
    let familyRef;
    if (action === "join") {
      const code = value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6,12}$/.test(code))
        throw new HttpsError("invalid-argument", "Código inválido.");
      const found = await tx.get(
        db.collection("families").where("code", "==", code).limit(1),
      );
      if (found.empty)
        throw new HttpsError("not-found", "Família não encontrada.");
      familyRef = found.docs[0].ref;
    } else {
      familyRef = db.collection("families").doc();
      tx.create(familyRef, {
        name: value.trim(),
        code: randomBytes(6).toString("hex").toUpperCase(),
        createdBy: uid,
        createdAt: new Date().toISOString(),
      });
    }
    tx.set(
      userRef,
      {
        uid,
        email: request.auth!.token.email ?? "",
        displayName:
          profile.data()?.displayName ?? request.auth!.token.name ?? "",
        familyId: familyRef.id,
        role: action === "create" ? "admin" : "dependent",
      },
      { merge: true },
    );
    return { familyId: familyRef.id };
  });
}
