import { logger } from "firebase-functions/v2";
import { cleanupExpiredTasks } from "../services/cleanupExpiredTasks";
export async function handleCleanup() {
  const result = await cleanupExpiredTasks();
  if (result.deleted) logger.info("Tarefas encerradas apagadas", result);
}
