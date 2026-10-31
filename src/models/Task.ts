import type { RecurrenceRule } from "./Recurrence";
import type { Subtask } from "./Subtask";
export interface Task extends Partial<RecurrenceRule> {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime?: string | null;
  category: string;
  completed: boolean;
  /** Recorrente pulada: arquivada sem concluir. */
  skipped?: boolean;
  familyId: string;
  createdBy: string;
  createdByName?: string | null;
  /** ISO 8601, preenchido pelo backend. */
  createdAt?: string | null;
  lastModifiedBy?: string | null;
  lastModifiedByName?: string | null;
  updatedAt?: string | null;
  isPrivate?: boolean;
  /** Responsável (uid de um membro) ou null. */
  assignedTo?: string | null;
  assignedToName?: string | null;
  subtasks?: Subtask[];
}
