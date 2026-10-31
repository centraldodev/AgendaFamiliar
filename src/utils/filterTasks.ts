import type { TaskFilter } from "../models/Navigation";
import type { Task } from "../models/Task";
export function filterTasks(tasks: Task[], filter: TaskFilter) {
  return tasks.filter(
    (task) =>
      filter === "all" ||
      (filter === "private"
        ? task.isPrivate
        : filter === "completed"
          ? task.completed
          : !task.completed),
  );
}
