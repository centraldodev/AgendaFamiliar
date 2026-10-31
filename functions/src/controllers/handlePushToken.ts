import type { CallableRequest } from "firebase-functions/v2/https";
import { requireAuth } from "../middlewares/requireAuth";
import { registerPushToken } from "../services/registerPushToken";
export async function handlePushToken(request: CallableRequest) {
  const uid = requireAuth(request);
  const { action, token } = request.data ?? {};
  return registerPushToken(uid, action, token);
}
