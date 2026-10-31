import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebase";
export async function resetPassword(email: string) {
  if (!email.trim()) throw new Error("Informe seu e-mail primeiro.");
  await sendPasswordResetEmail(auth, email.trim());
}
