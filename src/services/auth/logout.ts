import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import { unregisterPushToken } from "../notifications/unregisterPushToken";
export async function logout() {
  await unregisterPushToken();
  await signOut(auth);
}
