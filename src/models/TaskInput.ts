import type { Task } from "./Task";
export type TaskInput = Pick<
  Task,
  "title" | "description" | "dueDate" | "dueTime" | "category" | "isPrivate"
>;
