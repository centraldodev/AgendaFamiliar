import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase";
export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  categoryId?: string;
}
const endpoint = "https://exp.host/--/api/v2/push/send";
async function tokensOf(uids: string[]) {
  if (!uids.length) return [];
  const snaps = await db.getAll(...uids.map((uid) => db.doc(`users/${uid}`)));
  return snaps.flatMap((snap) =>
    ((snap.data()?.pushTokens as string[] | undefined) ?? []).map((token) => ({
      uid: snap.id,
      token,
    })),
  );
}
async function dropToken(uid: string, token: string) {
  await db
    .doc(`users/${uid}`)
    .update({ pushTokens: FieldValue.arrayRemove(token) })
    .catch(() => {});
}
// Falhas de notificação nunca devem desfazer a ação principal.
export async function notifyUsers(uids: string[], payload: PushPayload) {
  try {
    const targets = await tokensOf(uids);
    for (let i = 0; i < targets.length; i += 100) {
      const chunk = targets.slice(i, i + 100);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(
          chunk.map(({ token }) => ({
            to: token,
            sound: "default",
            channelId: "default",
            priority: "high",
            ...payload,
          })),
        ),
      });
      const body = (await response.json()) as {
        data?: { status: string; details?: { error?: string } }[];
      };
      await Promise.all(
        (body.data ?? []).map((ticket, index) =>
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
            ? dropToken(chunk[index].uid, chunk[index].token)
            : undefined,
        ),
      );
    }
  } catch (error) {
    console.error("Falha ao enviar notificação", error);
  }
}
export async function notifyFamilyAdmins(
  familyId: string,
  payload: PushPayload,
  exceptUid?: string,
) {
  const admins = await db
    .collection("users")
    .where("familyId", "==", familyId)
    .where("role", "==", "admin")
    .get();
  await notifyUsers(
    admins.docs.map((doc) => doc.id).filter((uid) => uid !== exceptUid),
    payload,
  );
}
