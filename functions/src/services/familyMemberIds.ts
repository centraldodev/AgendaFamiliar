import { db } from "../config/firebase";
export async function familyMemberIds(familyId: string) {
  const members = await db.collection("users").where("familyId", "==", familyId).get();
  return members.docs.map((doc) => doc.id);
}
