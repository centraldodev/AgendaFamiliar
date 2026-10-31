import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import type { FamilyRole } from "../../models/FamilyRole";
export async function changeMemberRole(uid: string, role: FamilyRole) {
  await httpsCallable(functions, "agendaFamilyAdmin")({
    action: "setRole",
    targetId: uid,
    role,
  });
}
