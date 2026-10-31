import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import { unregisterPushToken } from "../notifications/unregisterPushToken";
import { clearTaskCache } from "../tasks/taskCache";
import { forgetGoogleAccount } from "./loginWithGoogle";
export async function logout() {
  await unregisterPushToken();
  if (auth.currentUser) clearTaskCache(auth.currentUser.uid);
  await forgetGoogleAccount();
  await signOut(auth);
}
