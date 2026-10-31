import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
export async function logout() {
  await signOut(auth);
}
