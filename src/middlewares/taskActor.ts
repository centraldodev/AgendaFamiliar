import type { Actor } from "../../functions/src/shared/taskPermissions.ts";
import { normalizeRole } from "../../functions/src/shared/roles.ts";
import type { Profile } from "../models/Profile";
// Perfil do app no formato das permissões compartilhadas com o backend.
export const taskActor = (profile: Profile): Actor => ({
  uid: profile.uid,
  familyId: profile.familyId ?? "",
  role: normalizeRole(profile.role),
});
