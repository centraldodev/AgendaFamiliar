import type { FamilyRole } from "./FamilyRole";
export interface Profile {
  uid: string;
  email: string;
  displayName?: string;
  familyId?: string;
  role?: FamilyRole | null;
}
