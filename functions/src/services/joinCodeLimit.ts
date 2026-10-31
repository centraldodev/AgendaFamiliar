import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
const maxFailures = 8;
const windowMs = 10 * 60 * 1000;
// Limita tentativas de código inexistente para dificultar adivinhar convites.
export async function assertJoinCodeAllowed(uid: string) {
  const data = (await db.doc(`rateLimits/${uid}`).get()).data();
  if (!data || Date.now() - Number(data.windowStart) > windowMs) return;
  if (Number(data.failures) >= maxFailures)
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas com código inválido. Aguarde alguns minutos.",
    );
}
export async function recordJoinCodeFailure(uid: string) {
  const ref = db.doc(`rateLimits/${uid}`);
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    const fresh = !data || Date.now() - Number(data.windowStart) > windowMs;
    tx.set(ref, {
      windowStart: fresh ? Date.now() : data.windowStart,
      failures: fresh ? 1 : Number(data.failures) + 1,
    });
  });
}
