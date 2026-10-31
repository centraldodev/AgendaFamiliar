import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase";
export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}
