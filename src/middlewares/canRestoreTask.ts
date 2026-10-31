import { canRestore } from "../../functions/src/shared/taskPermissions.ts";
import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
import { taskActor } from "./taskActor";
export function canRestoreTask(task: Task, profile: Profile) {
  return canRestore(task as unknown as Record<string, unknown>, taskActor(profile));
}
