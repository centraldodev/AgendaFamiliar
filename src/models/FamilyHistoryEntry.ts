export type FamilyHistoryType =
  | "family_created"
  | "join_requested"
  | "join_cancelled"
  | "join_approved"
  | "join_rejected"
  | "role_changed"
  | "member_removed"
  | "member_left";
export interface FamilyHistoryEntry {
  id: string;
  type: FamilyHistoryType;
  at: string;
  actorName?: string;
  targetName?: string;
  role?: string;
  fromRole?: string;
  toRole?: string;
}
