import { logger } from "firebase-functions/v2";
import { notifyDueTasks } from "../services/notifyDueTasks";
export async function handleDueTasks() {
  const result = await notifyDueTasks();
  if (result.sent) logger.info("Avisos de vencimento enviados", result);
}
