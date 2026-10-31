import type { Profile } from "../models/Profile";
export function isAdmin(profile: Profile | null | undefined) {
  return profile?.role === "admin";
}
