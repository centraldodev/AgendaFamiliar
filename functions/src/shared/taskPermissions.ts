import { normalizeRole } from "./roles";
type Raw = Record<string, unknown>;
// Fonte única das permissões de tarefa: usada pelo backend e pelo app (src/middlewares).
// O firestore.rules repete estas regras (não importa TS); os testes de regras cobrem os mesmos casos.
export interface Actor {
  uid: string;
  familyId: string;
  role: "admin" | "user";
}
export const actorOf = (uid: string, profile: Raw | undefined): Actor | null =>
  typeof profile?.familyId === "string" && profile.familyId
    ? { uid, familyId: profile.familyId, role: normalizeRole(profile.role) }
    : null;
export const ownerOf = (t: Raw) => t.createdBy as string | undefined;
const isAdmin = (a: Actor) => a.role === "admin";
export const canRead = (t: Raw, a: Actor) =>
  t.familyId === a.familyId && (t.isPrivate !== true || ownerOf(t) === a.uid);
/** Concluir, pular e marcar subtarefas. */
export const canComplete = (t: Raw, a: Actor) =>
  ownerOf(t) === a.uid || (t.isPrivate !== true && isAdmin(a));
/** Editar detalhes e excluir. */
export const canEdit = (t: Raw, a: Actor) =>
  isAdmin(a) && (ownerOf(t) === a.uid || t.isPrivate !== true);
export const canDelete = canEdit;
/** Reabrir concluída ou pulada. */
export const canRestore = (t: Raw, a: Actor) =>
  (t.completed === true || t.skipped === true) && canEdit(t, a);
export const canCreatePrivate = isAdmin;
