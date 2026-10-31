import type { Profile } from "../models/Profile";
import type { Task } from "../models/Task";
import { canEditTask } from "./canEditTask";
import { requireAuthenticatedUser } from "./requireAuthenticatedUser";
export function requireCanEditTask(task: Task, profile: Profile) {
  const user = requireAuthenticatedUser();
  if (user.uid !== profile.uid || !canEditTask(task, profile))
    throw new Error("Somente administradores editam tarefas.");
  return user;
}
