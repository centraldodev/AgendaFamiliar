import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
const expoToken = /^Expo(nent)?PushToken\[[^\]]{8,200}\]$/;
export async function registerPushToken(
  uid: string,
  action: unknown,
  token: unknown,
) {
  if (typeof token !== "string" || !expoToken.test(token))
    throw new HttpsError("invalid-argument", "Token de notificação inválido.");
  if (action === "unregister") {
    await db
      .doc(`users/${uid}`)
      .update({ pushTokens: FieldValue.arrayRemove(token) })
      .catch(() => {});
    return { registered: false };
  }
  // Um aparelho pertence a uma conta por vez: remove o token das demais.
  const others = await db
    .collection("users")
    .where("pushTokens", "array-contains", token)
    .get();
  await Promise.all(
    others.docs
      .filter((doc) => doc.id !== uid)
      .map((doc) =>
        doc.ref.update({ pushTokens: FieldValue.arrayRemove(token) }),
      ),
  );
  await db
    .doc(`users/${uid}`)
    .set({ pushTokens: FieldValue.arrayUnion(token) }, { merge: true });
  return { registered: true };
}
