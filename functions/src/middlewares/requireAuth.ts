import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
export function requireAuth(request: CallableRequest) {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Entre na sua conta.");
  return request.auth.uid;
}
