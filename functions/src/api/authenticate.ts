import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { ApiError } from "./http";
// Tokens pessoais: apiTokens/{id} { hash (SHA-256), uid, name, createdAt, lastUsedAt, revoked }.
export const tokenCollection = "apiTokens";
export const tokenPrefix = "agf_";
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export function newToken() {
  return `${tokenPrefix}${randomBytes(32).toString("base64url")}`;
}
export interface Caller {
  uid: string;
  /** "firebase": ID token do Firebase Auth; "token": token pessoal. */
  method: "firebase" | "token";
}
// Tokens recusados ficam em cache por 5 min: repetir um token falso não gera leitura no banco.
const rejected = new Map<string, number>();
const rejectedTtlMs = 5 * 60 * 1000;
const looksLikeJwt = (value: string) => value.split(".").length === 3;
export async function authenticate(header: string | undefined): Promise<Caller> {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  if (!match)
    throw new ApiError(401, "unauthenticated", "Envie o cabeçalho Authorization: Bearer <token>.");
  const credential = match[1].trim();
  if (looksLikeJwt(credential)) {
    try {
      const decoded = await getAuth().verifyIdToken(credential);
      return { uid: decoded.uid, method: "firebase" };
    } catch {
      throw new ApiError(401, "invalid-token", "Token do Firebase inválido ou expirado.");
    }
  }
  const hash = sha256(credential);
  if ((rejected.get(hash) ?? 0) > Date.now())
    throw new ApiError(401, "invalid-token", "Token inválido ou revogado.");
  if (!/^agf_[A-Za-z0-9_-]{43}$/.test(credential)) {
    rejected.set(hash, Date.now() + rejectedTtlMs);
    throw new ApiError(401, "invalid-token", "Token inválido ou revogado.");
  }
  const snap = await db
    .collection(tokenCollection)
    .where("hash", "==", hash)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc || doc.data().revoked === true || typeof doc.data().uid !== "string") {
    if (rejected.size > 5000) rejected.clear();
    rejected.set(hash, Date.now() + rejectedTtlMs);
    throw new ApiError(401, "invalid-token", "Token inválido ou revogado.");
  }
  // Atualiza "último uso" no máximo uma vez por hora, para não gravar a cada chamada.
  const lastUsed = doc.data().lastUsedAt as Timestamp | null | undefined;
  if (!lastUsed || Date.now() - lastUsed.toMillis() > 60 * 60 * 1000)
    void doc.ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});
  return { uid: doc.data().uid, method: "token" };
}
