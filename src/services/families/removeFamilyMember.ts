import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
export async function removeFamilyMember(uid: string) {
  await httpsCallable(functions, "agendaFamilyAdmin")({
    action: "remove",
    targetId: uid,
  });
}
