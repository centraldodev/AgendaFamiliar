import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
export async function familyAction(action: "create" | "join", value: string) {
  await httpsCallable(functions, "agendaSimpleFamily")({ action, value });
}
