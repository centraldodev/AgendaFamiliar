import type { Transaction } from "firebase-admin/firestore";
import { db } from "../config/firebase";
export type HistoryType =
  | "family_created"
  | "join_requested"
  | "join_cancelled"
  | "join_approved"
  | "join_rejected"
  | "role_changed"
  | "member_removed"
  | "member_left";
export interface HistoryEvent {
  type: HistoryType;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  role?: string;
  fromRole?: string;
  toRole?: string;
}
// O histórico é imutável: só o backend cria registros, nunca os altera.
export function recordHistory(
  tx: Transaction,
  familyId: string,
  event: HistoryEvent,
) {
  const clean = Object.fromEntries(
    Object.entries(event).filter(([, value]) => value !== undefined),
  );
  tx.create(db.collection(`families/${familyId}/history`).doc(), {
    ...clean,
    at: new Date().toISOString(),
  });
}
