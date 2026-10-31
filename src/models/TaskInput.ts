import type { RecurrenceRule } from "./Recurrence";
import type { Subtask } from "./Subtask";
import type { Task } from "./Task";
export type TaskInput = Pick<
  Task,
  "title" | "description" | "dueDate" | "dueTime" | "category" | "isPrivate"
> &
  RecurrenceRule & { subtasks: Subtask[] };
