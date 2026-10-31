import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import type { FamilyRole } from "../../models/FamilyRole";
export async function approveJoinRequest(requestId: string, role: FamilyRole) {
  await httpsCallable(functions, "agendaFamilyAdmin")({
    action: "approve",
    targetId: requestId,
    role,
  });
}
