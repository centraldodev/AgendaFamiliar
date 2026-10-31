import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { isFamilyRole } from "../shared/roles";
import { requireAuth } from "../middlewares/requireAuth";
import { approveJoinRequest } from "../services/approveJoinRequest";
import { changeMemberRole } from "../services/changeMemberRole";
import { rejectJoinRequest } from "../services/rejectJoinRequest";
import { removeFamilyMember } from "../services/removeFamilyMember";
// Ações restritas a administradores; cada serviço revalida o papel na transação.
export async function handleFamilyAdmin(request: CallableRequest) {
  const uid = requireAuth(request);
  const { action, targetId, role } = request.data ?? {};
  if (typeof targetId !== "string" || !targetId || targetId.length > 128)
    throw new HttpsError("invalid-argument", "Membro inválido.");
  switch (action) {
    case "approve":
      if (!isFamilyRole(role))
        throw new HttpsError("invalid-argument", "Escolha o tipo de acesso.");
      return approveJoinRequest(uid, targetId, role);
    case "reject":
      return rejectJoinRequest(uid, targetId);
    case "setRole":
      if (!isFamilyRole(role))
        throw new HttpsError("invalid-argument", "Escolha o tipo de acesso.");
      return changeMemberRole(uid, targetId, role);
    case "remove":
      return removeFamilyMember(uid, targetId);
    default:
      throw new HttpsError("invalid-argument", "Ação desconhecida.");
  }
}
