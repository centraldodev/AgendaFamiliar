import { HttpsError } from "firebase-functions/v2/https";
import type { Transaction } from "firebase-admin/firestore";
import { db } from "../config/firebase";
// Impede que o único administrador deixe a família com outros membros sem gestão.
export async function assertCanLeaveFamily(
  tx: Transaction,
  uid: string,
  familyId: string,
) {
  const members = await tx.get(
    db.collection("users").where("familyId", "==", familyId),
  );
  const admins = members.docs.filter((member) => member.data().role === "admin");
  const isOnlyAdmin = admins.length === 1 && admins[0].id === uid;
  if (isOnlyAdmin && members.size > 1)
    throw new HttpsError(
      "failed-precondition",
      "Você é o único administrador do seu grupo. Promova outro membro a administrador antes de sair.",
    );
}
