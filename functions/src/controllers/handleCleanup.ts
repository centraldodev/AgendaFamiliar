import { logger } from "firebase-functions/v2";
import { cleanupExpiredTasks } from "../services/cleanupExpiredTasks";
import { deleteExpiredGrants } from "../oauth/grants";
export async function handleCleanup() {
  const result = await cleanupExpiredTasks();
  if (result.deleted) logger.info("Tarefas encerradas apagadas", result);
  await deleteExpiredGrants();
}
