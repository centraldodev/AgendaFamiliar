import { EmailAuthProvider, reauthenticateWithCredential, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../../config/firebase";
import { requireAuthenticatedUser } from "../../middlewares/requireAuthenticatedUser";
import { unregisterPushToken } from "../notifications/unregisterPushToken";
import { clearTaskCache } from "../tasks/taskCache";
// O servidor exige login recente: com senha, reautentica aqui mesmo.
export async function deleteAccount(password?: string) {
  const user = requireAuthenticatedUser();
  if (password && user.email)
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await user.getIdToken(true);
  await unregisterPushToken().catch(() => {});
  await httpsCallable(functions, "agendaAccount")({ action: "delete" });
  clearTaskCache(user.uid);
  // A conta não existe mais: encerra a sessão local.
  await signOut(auth).catch(() => {});
}
