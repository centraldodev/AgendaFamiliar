import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import type { Family } from "../../models/Family";
export async function loadFamily(id: string): Promise<Family> {
  const snapshot = await getDoc(doc(db, "families", id));
  if (!snapshot.exists()) throw new Error("Família não encontrada.");
  return { ...snapshot.data(), id } as Family;
}
