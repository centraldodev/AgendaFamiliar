import { auth } from "../config/firebase";
export function requireAuthenticatedUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Entre na sua conta.");
  return user;
}
