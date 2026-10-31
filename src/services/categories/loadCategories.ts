import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import type { Category } from "../../models/Category";
export async function loadCategories(familyId: string): Promise<Category[]> {
  // A consulta fixa familyId, como exige a regra de leitura.
  const snapshot = await getDocs(
    query(collection(db, "categories"), where("familyId", "==", familyId)),
  );
  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      label: String(doc.data().label ?? "").trim(),
      icon: typeof doc.data().icon === "string" ? doc.data().icon : undefined,
    }))
    .filter((item) => item.label);
}
