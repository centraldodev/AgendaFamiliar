import type { Profile } from "../models/Profile";
import { isAdmin } from "./isAdmin";
export function canCreatePrivateTask(profile: Profile | null | undefined) {
  return isAdmin(profile);
}
