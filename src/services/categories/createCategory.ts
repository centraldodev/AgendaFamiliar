import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { requireFamilyMember } from "../../middlewares/requireFamilyMember";
import type { Profile } from "../../models/Profile";
// Grava no formato do app anterior; ícone e cor ficam com os valores neutros de lá.
export async function createCategory(profile: Profile, label: string) {
  requireFamilyMember(profile);
  const ref = await addDoc(collection(db, "categories"), {
    label,
    icon: "grid-outline",
    color: "#6B7280",
    familyId: profile.familyId,
    isDefault: false,
    createdBy: profile.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
