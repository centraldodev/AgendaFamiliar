import type { DocumentData } from "firebase-admin/firestore";
export function displayNameOf(profile: DocumentData | undefined) {
  return (
    String(profile?.displayName ?? "").trim() ||
    String(profile?.email ?? "").trim() ||
    "Membro"
  );
}
