import type { FamilyHistoryEntry } from "../models/FamilyHistoryEntry";
export const roleLabels: Record<string, string> = {
  admin: "Administrador",
  user: "Usuário",
};
const roleName = (role?: string) => roleLabels[role ?? ""] ?? role ?? "";
export function describeHistory(entry: FamilyHistoryEntry) {
  const actor = entry.actorName || "Alguém";
  const target = entry.targetName || "um membro";
  switch (entry.type) {
    case "family_created":
      return `${actor} criou o grupo como ${roleName(entry.role)}.`;
    case "join_requested":
      return `${target} pediu para entrar no grupo.`;
    case "join_cancelled":
      return `${target} cancelou o pedido de entrada.`;
    case "join_approved":
      return `${actor} aprovou a entrada de ${target} como ${roleName(entry.role)}.`;
    case "join_rejected":
      return `${actor} recusou a entrada de ${target}.`;
    case "role_changed":
      return `${actor} mudou ${target} de ${roleName(entry.fromRole)} para ${roleName(entry.toRole)}.`;
    case "member_removed":
      return `${actor} removeu ${target} do grupo.`;
    case "member_left":
      return `${target} saiu do grupo.`;
  }
}
