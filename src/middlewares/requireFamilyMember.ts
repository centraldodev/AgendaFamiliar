import type { Profile } from "../models/Profile";
import { requireAuthenticatedUser } from "./requireAuthenticatedUser";
export function requireFamilyMember(profile: Profile) {
  const user = requireAuthenticatedUser();
  if (!profile.familyId || user.uid !== profile.uid)
    throw new Error("Entre em uma família.");
  return user;
}
