import type { User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import type { Profile } from "../../models/Profile";
export async function loadProfile(user: User): Promise<Profile> {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return snapshot.data() as Profile;
  const profile = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}
