import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
export async function rejectJoinRequest(requestId: string) {
  await httpsCallable(functions, "agendaFamilyAdmin")({
    action: "reject",
    targetId: requestId,
  });
}
