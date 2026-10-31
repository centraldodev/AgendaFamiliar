import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { requireAuth } from "../middlewares/requireAuth";
import { cancelJoinRequest } from "../services/cancelJoinRequest";
import { createFamily } from "../services/createFamily";
import { requestJoinFamily } from "../services/requestJoinFamily";
export async function handleFamily(request: CallableRequest) {
  const uid = requireAuth(request);
  const { action, value } = request.data ?? {};
  if (action === "cancel") return cancelJoinRequest(uid);
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
  const identity = {
    email: String(request.auth!.token.email ?? ""),
    name: String(request.auth!.token.name ?? ""),
  };
  return action === "create"
    ? createFamily(uid, identity, value.trim())
    : requestJoinFamily(uid, identity, value);
}
