import { canRead } from "../shared/taskPermissions";
// Leitura sem depender do papel (só família, exclusão e privacidade).
export function canReadTask(
  task: Record<string, unknown>,
  uid: string,
  familyId: string,
): boolean {
  return canRead(task, { uid, familyId, role: "user" });
}
