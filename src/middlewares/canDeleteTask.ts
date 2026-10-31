import { canDelete } from "../../functions/src/shared/taskPermissions.ts";
import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
import { taskActor } from "./taskActor";
export function canDeleteTask(task: Task, profile: Profile) {
  return canDelete(task as unknown as Record<string, unknown>, taskActor(profile));
}
