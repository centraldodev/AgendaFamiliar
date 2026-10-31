// Compartilhado com o app (que monta as tarefas recebidas em tempo real). Sem imports.
type Raw = Record<string, unknown>;
// Registros antigos guardam datas como Timestamp, texto ISO ou milissegundos.
export function toIso(value: unknown): string | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function")
    return (value as { toDate: () => Date }).toDate().toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}
// Formato público da tarefa, o mesmo para o app e para a API REST.
export function serializeTask(id: string, t: Raw, names: Map<string, string>) {
  const author = (t.createdBy ?? "") as string;
  return {
    id,
    title: String(t.title ?? ""),
    description: String(t.description ?? ""),
    dueDate: String(t.dueDate ?? ""),
    dueTime: typeof t.dueTime === "string" ? t.dueTime : null,
    category: String(t.category ?? ""),
    completed: t.completed === true,
    skipped: t.skipped === true,
    familyId: String(t.familyId ?? ""),
    createdBy: author,
    createdByName: names.get(author) ?? null,
    createdAt: toIso(t.createdAt),
    lastModifiedBy: typeof t.lastModifiedBy === "string" ? t.lastModifiedBy : null,
    lastModifiedByName: names.get(t.lastModifiedBy as string) ?? null,
    updatedAt: toIso(t.updatedAt),
    isPrivate: t.isPrivate === true,
    assignedTo: typeof t.assignedTo === "string" ? t.assignedTo : null,
    assignedToName: names.get(t.assignedTo as string) ?? null,
    recurrence: String(t.recurrence ?? "none"),
    weekDays: Array.isArray(t.weekDays) ? t.weekDays : null,
    recurrenceInterval: typeof t.recurrenceInterval === "number" ? t.recurrenceInterval : null,
    recurrenceEndDate: typeof t.recurrenceEndDate === "string" ? t.recurrenceEndDate : null,
    // Subtarefas: { id, title, completed } e, opcionais, category, dueDate e dueTime.
    subtasks: (Array.isArray(t.subtasks) ? t.subtasks : [])
      .filter((item: Raw) => typeof item?.title === "string" && (item.title as string).trim())
      .map((item: Raw, index: number) => ({
        id: String(item.id ?? index),
        title: String(item.title),
        completed: item.completed === true,
        category: typeof item.category === "string" ? item.category : null,
        dueDate: typeof item.dueDate === "string" ? item.dueDate : null,
        dueTime: typeof item.dueTime === "string" ? item.dueTime : null,
      })),
  };
}
export type PublicTask = ReturnType<typeof serializeTask>;
