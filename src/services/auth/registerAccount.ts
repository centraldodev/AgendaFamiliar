import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../config/firebase";
import { loadProfile } from "../profiles/loadProfile";
import { updateProfileName } from "../profiles/updateProfileName";
export async function registerAccount(
  email: string,
  password: string,
  name: string,
) {
  if (!name.trim()) throw new Error("Informe seu nome.");
  const result = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  await updateProfile(result.user, { displayName: name.trim() });
  await loadProfile(result.user);
  await updateProfileName(result.user.uid, name.trim());
}
