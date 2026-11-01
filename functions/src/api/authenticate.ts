import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import type { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase";
import { ApiError } from "./http";
// Tokens de acesso da vinculação com a Alexa: accessTokens/{sha256(token)} { uid, linkId, expiresAt }.
export const accessTokenCollection = "accessTokens";
export const tokenPrefix = "agf_";
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export function newToken() {
  return `${tokenPrefix}${randomBytes(32).toString("base64url")}`;
}
export interface Caller {
  uid: string;
  /** "firebase": ID token do Firebase Auth (app); "alexa": token da conta vinculada. */
  method: "firebase" | "alexa";
}
// Tokens recusados ficam em cache por 5 min: repetir um token falso não gera leitura no banco.
const rejected = new Map<string, number>();
const rejectedTtlMs = 5 * 60 * 1000;
const looksLikeJwt = (value: string) => value.split(".").length === 3;
const invalid = () => new ApiError(401, "invalid-token", "Token inválido ou expirado. Vincule a conta de novo.");
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
  if ((rejected.get(hash) ?? 0) > Date.now()) throw invalid();
  const reject = () => {
    if (rejected.size > 5000) rejected.clear();
    rejected.set(hash, Date.now() + rejectedTtlMs);
    return invalid();
  };
  if (!/^agf_[A-Za-z0-9_-]{43}$/.test(credential)) throw reject();
  const data = (await db.doc(`${accessTokenCollection}/${hash}`).get()).data();
  const expiresAt = data?.expiresAt as Timestamp | undefined;
  if (!data || typeof data.uid !== "string" || !expiresAt || expiresAt.toMillis() <= Date.now()) throw reject();
  return { uid: data.uid, method: "alexa" };
}
