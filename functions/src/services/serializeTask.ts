import { db } from "../config/firebase";
import { displayNameOf } from "./displayNameOf";
export { serializeTask, toIso, type PublicTask } from "../shared/serializeTask";
type Raw = Record<string, unknown>;
// Perfis são privados no Firestore; o backend resolve só os nomes de autor e editor.
export async function resolveAuthorNames(tasks: Raw[]) {
  const ids = [
    ...new Set(
      tasks.flatMap((t) =>
        [t.createdBy, t.lastModifiedBy, t.assignedTo].filter(
          (id): id is string => typeof id === "string" && !!id,
        ),
      ),
    ),
  ];
  const names = new Map<string, string>();
  if (ids.length)
    for (const snap of await db.getAll(...ids.map((id) => db.doc(`users/${id}`))))
      names.set(snap.id, snap.exists ? displayNameOf(snap.data()) : "Ex-membro");
  return names;
}
