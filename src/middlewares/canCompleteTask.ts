import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
export function canCompleteTask(task: Task, profile: Profile) {
  return (
    task.createdBy === profile.uid ||
    (!task.isPrivate && profile.role === "admin")
  );
}
