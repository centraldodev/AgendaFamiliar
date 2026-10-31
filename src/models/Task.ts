export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime?: string | null;
  category: string;
  completed: boolean;
  familyId: string;
  createdBy: string;
  isPrivate?: boolean;
  recurrence?: string;
  subtasks?: unknown[];
}
