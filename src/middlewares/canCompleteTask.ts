import { canComplete } from "../../functions/src/shared/taskPermissions.ts";
import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
import { taskActor } from "./taskActor";
export function canCompleteTask(task: Task, profile: Profile) {
  return canComplete(task as unknown as Record<string, unknown>, taskActor(profile));
}
