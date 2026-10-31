import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
export async function cancelJoinRequest() {
  await httpsCallable(functions, "agendaSimpleFamily")({ action: "cancel" });
}
