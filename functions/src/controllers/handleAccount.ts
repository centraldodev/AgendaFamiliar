import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { requireAuth } from "../middlewares/requireAuth";
import { deleteAccount } from "../services/deleteAccount";
export async function handleAccount(request: CallableRequest) {
  const uid = requireAuth(request);
  const { action } = request.data ?? {};
  if (action !== "delete") throw new HttpsError("invalid-argument", "Ação desconhecida.");
  // Exige login recente (até 10 min), como o Firebase Auth faz para ações sensíveis.
  const authTime = Number(request.auth?.token.auth_time ?? 0) * 1000;
  if (Date.now() - authTime > 10 * 60 * 1000)
    throw new HttpsError("failed-precondition", "Por segurança, confirme sua senha para excluir a conta.");
  return deleteAccount(uid);
}
