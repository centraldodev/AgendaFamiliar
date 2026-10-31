export const familyRoles = ["admin", "user"] as const;
export type FamilyRole = (typeof familyRoles)[number];
export function isFamilyRole(value: unknown): value is FamilyRole {
  return familyRoles.includes(value as FamilyRole);
}
// Sem papel definido vale como "user".
export function normalizeRole(value: unknown): FamilyRole {
  return value === "admin" ? "admin" : "user";
}
