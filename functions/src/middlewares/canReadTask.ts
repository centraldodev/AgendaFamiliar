export function canReadTask(
  task: Record<string, unknown>,
  uid: string,
  familyId: string,
): boolean {
  return (
    task.familyId === familyId &&
    !task.deletedAt &&
    (task.isPrivate !== true || task.createdBy === uid)
  );
}
