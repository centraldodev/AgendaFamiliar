export interface Profile {
  uid: string;
  email: string;
  displayName?: string;
  familyId?: string;
  role?: "admin" | "parent" | "dependent";
}
