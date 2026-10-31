// Identificadores dos botões da notificação de solicitação de entrada.
export const joinRequestCategory = "join_request";
export const joinRequestActions = {
  approveUser: "approve_user",
  approveAdmin: "approve_admin",
  reject: "reject",
} as const;
export type PushStatus = "unknown" | "enabled" | "denied" | "unavailable";
