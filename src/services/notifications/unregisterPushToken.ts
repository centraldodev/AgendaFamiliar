import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import { pushTokenStore } from "./pushTokenStore";
// Ao sair da conta, o aparelho deixa de receber avisos dela.
export async function unregisterPushToken() {
  const token = pushTokenStore.get();
  if (!token) return;
  pushTokenStore.set(null);
  await httpsCallable(functions, "agendaPushToken")({
    action: "unregister",
    token,
  }).catch(() => {});
}
