import { HttpsError } from "firebase-functions/v2/https";
import type { DocumentData } from "firebase-admin/firestore";
// Pré-condição lida dentro da transação: o chamador é administrador da família.
export function requireFamilyAdmin(
  profile: DocumentData | undefined,
  familyId?: string,
) {
  const adminFamilyId = profile?.familyId;
  if (
    typeof adminFamilyId !== "string" ||
    !adminFamilyId ||
    profile?.role !== "admin" ||
    (familyId !== undefined && adminFamilyId !== familyId)
  )
    throw new HttpsError(
      "permission-denied",
      "Somente administradores da família podem fazer isso.",
    );
  return adminFamilyId;
}
