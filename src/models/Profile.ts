import type { FamilyRole } from "./FamilyRole";
export interface Profile {
  uid: string;
  email: string;
  displayName?: string;
  familyId?: string;
  role?: FamilyRole | null;
  /** Antecedência do lembrete em minutos (-1 = desligado; ausente = no horário). */
  reminderMinutes?: number;
}
