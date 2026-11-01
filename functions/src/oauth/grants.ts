import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { accessTokenCollection, newToken, sha256 } from "../api/authenticate";
import { accessTtlSeconds, codeTtlMs } from "./config";
// Coleções (só o backend acessa; as regras negam tudo ao app):
// - oauthCodes/{sha256(código)}   { uid, clientId, redirectUri, expiresAt }  — uso único, 5 min
// - alexaLinks/{sha256(refresh)}  { uid, clientId, createdAt, lastUsedAt }  — uma por vinculação
// - accessTokens/{sha256(token)}  { uid, linkId, expiresAt }                — 1 hora
export const codeCollection = "oauthCodes";
export const linkCollection = "alexaLinks";
export class GrantError extends Error {
  constructor(readonly code: "invalid_grant" | "invalid_request") {
    super(code);
  }
}
export async function createCode(uid: string, clientId: string, redirectUri: string) {
  const code = randomBytes(32).toString("base64url");
  await db.doc(`${codeCollection}/${sha256(code)}`).set({
    uid,
    clientId,
    redirectUri,
    expiresAt: Timestamp.fromMillis(Date.now() + codeTtlMs),
  });
  return code;
}
async function issueAccessToken(uid: string, linkId: string) {
  const token = newToken();
  await db.doc(`${accessTokenCollection}/${sha256(token)}`).set({
    uid,
    linkId,
    expiresAt: Timestamp.fromMillis(Date.now() + accessTtlSeconds * 1000),
  });
  return token;
}
const response = (accessToken: string, refreshToken?: string) => ({
  access_token: accessToken,
  token_type: "bearer",
  expires_in: accessTtlSeconds,
  ...(refreshToken ? { refresh_token: refreshToken } : {}),
});
/** Troca o código (uso único) por tokens; o código vale só para o mesmo cliente e endereço. */
export async function exchangeCode(code: unknown, redirectUri: unknown, clientId: string) {
  if (typeof code !== "string" || !code) throw new GrantError("invalid_request");
  const ref = db.doc(`${codeCollection}/${sha256(code)}`);
  const grant = await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    if (data) tx.delete(ref);
    return data;
  });
  if (
    !grant ||
    (grant.expiresAt as Timestamp).toMillis() < Date.now() ||
    grant.clientId !== clientId ||
    grant.redirectUri !== redirectUri
  )
    throw new GrantError("invalid_grant");
  const refreshToken = randomBytes(32).toString("base64url");
  const linkId = sha256(refreshToken);
  await db.doc(`${linkCollection}/${linkId}`).set({
    uid: grant.uid,
    clientId,
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: FieldValue.serverTimestamp(),
  });
  return response(await issueAccessToken(grant.uid, linkId), refreshToken);
}
/** Novo token de acesso; desvincular no app apaga a vinculação e o refresh deixa de valer. */
export async function refreshAccess(refreshToken: unknown, clientId: string) {
  if (typeof refreshToken !== "string" || !refreshToken) throw new GrantError("invalid_request");
  const ref = db.doc(`${linkCollection}/${sha256(refreshToken)}`);
  const link = (await ref.get()).data();
  if (!link || link.clientId !== clientId || typeof link.uid !== "string") throw new GrantError("invalid_grant");
  await ref.update({ lastUsedAt: FieldValue.serverTimestamp() });
  return response(await issueAccessToken(link.uid, ref.id));
}
async function deleteAll(query: FirebaseFirestore.Query) {
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
/** Desvincula todas as Alexas da pessoa (app ou exclusão da conta). */
export async function unlinkAll(uid: string) {
  await deleteAll(db.collection(linkCollection).where("uid", "==", uid));
  await deleteAll(db.collection(accessTokenCollection).where("uid", "==", uid));
  await deleteAll(db.collection(codeCollection).where("uid", "==", uid));
}
/** Limpeza diária: tokens de acesso e códigos vencidos. */
export async function deleteExpiredGrants() {
  const now = Timestamp.now();
  await deleteAll(db.collection(accessTokenCollection).where("expiresAt", "<", now));
  await deleteAll(db.collection(codeCollection).where("expiresAt", "<", now));
}
