import { doc, setDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
export async function updateProfileName(uid: string, displayName: string) {
  await setDoc(doc(db, "users", uid), { displayName }, { merge: true });
}
