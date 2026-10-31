import type { User } from "firebase/auth";
import { loadFamily } from "../families/loadFamily";
import { loadProfile } from "../profiles/loadProfile";
export async function loadSessionContext(user: User) {
  const profile = await loadProfile(user);
  const family = profile.familyId ? await loadFamily(profile.familyId) : null;
  return { profile, family };
}
