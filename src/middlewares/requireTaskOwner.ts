import type { Task } from "../models/Task";
import { requireAuthenticatedUser } from "./requireAuthenticatedUser";
export function requireTaskOwner(task: Task) {
  const user = requireAuthenticatedUser();
  if (task.createdBy !== user.uid)
    throw new Error("Somente o criador altera os detalhes.");
  return user;
}
