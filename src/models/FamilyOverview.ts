import type { FamilyHistoryEntry } from "./FamilyHistoryEntry";
import type { FamilyMember } from "./FamilyMember";
import type { FamilyRole } from "./FamilyRole";
import type { JoinRequest, MyJoinRequest } from "./JoinRequest";
export interface FamilyOverview {
  familyId: string | null;
  role: FamilyRole | null;
  members: FamilyMember[];
  pending: JoinRequest[];
  history: FamilyHistoryEntry[];
  myRequest: MyJoinRequest | null;
}
