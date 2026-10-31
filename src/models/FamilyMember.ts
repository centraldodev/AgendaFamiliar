import type { FamilyRole } from "./FamilyRole";
export interface FamilyMember {
  uid: string;
  displayName: string;
  email: string;
  role: FamilyRole;
}
