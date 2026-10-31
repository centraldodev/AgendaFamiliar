import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../config/firebase";
export function subscribeToAuth(listener: (user: User | null) => void) {
  return onAuthStateChanged(auth, listener);
}
