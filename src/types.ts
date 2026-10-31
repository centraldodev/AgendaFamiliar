export interface Profile {
  uid: string;
  email: string;
  displayName?: string;
  familyId?: string;
  role?: "admin" | "parent" | "dependent";
}
export interface Family {
  id: string;
  name: string;
  code: string;
}
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
export type TaskInput = Pick<
  Task,
  "title" | "description" | "dueDate" | "dueTime" | "category" | "isPrivate"
>;
