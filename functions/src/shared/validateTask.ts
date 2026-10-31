type Raw = Record<string, unknown>;
// Fonte única da validação de tarefa: backend (API) e app (src/utils/validateTaskInput.ts).
// Os limites repetem o firestore.rules (título 160, descrição 4000, categoria 100, 30 subtarefas).
// Sem imports: roda no app e no backend.
export interface FieldError {
  field: string;
  message: string;
}
const recurrences = ["none", "daily", "weekly", "custom_weekly", "interval", "monthly", "yearly"];
const validDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const validTime = (value: unknown): value is string =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const optionalString = (value: unknown) => (typeof value === "string" && value ? value : null);
export const taskFields = [
  "title", "description", "dueDate", "dueTime", "category", "isPrivate",
  "subtasks", "recurrence", "weekDays", "recurrenceInterval", "recurrenceEndDate", "assignedTo",
] as const;
/** Valida uma tarefa completa e devolve os campos normalizados ou a lista de erros por campo. */
export function validateTask(merged: Raw) {
  const errors: FieldError[] = [];
  const fail = (field: string, message: string) => errors.push({ field, message });
  const title = typeof merged.title === "string" ? merged.title.trim() : "";
  if (!title || title.length > 160) fail("title", "Informe o título (até 160 caracteres).");
  const description = merged.description ?? "";
  if (typeof description !== "string" || description.length > 4000)
    fail("description", "A descrição deve ser texto de até 4000 caracteres.");
  if (!validDate(merged.dueDate)) fail("dueDate", "Informe uma data válida no formato AAAA-MM-DD.");
  const dueTime = merged.dueTime ?? null;
  if (dueTime !== null && dueTime !== "" && !validTime(dueTime))
    fail("dueTime", "Informe o horário no formato HH:MM.");
  const category = merged.category ?? "";
  if (typeof category !== "string" || !category || category.length > 100)
    fail("category", "Informe a categoria (até 100 caracteres).");
  const isPrivate = merged.isPrivate ?? false;
  if (typeof isPrivate !== "boolean") fail("isPrivate", "Use true ou false.");
  // Responsável: uid de um membro da família (conferido no servidor) ou null.
  const assignedTo = merged.assignedTo ?? null;
  if (assignedTo !== null && (typeof assignedTo !== "string" || !assignedTo || assignedTo.length > 128))
    fail("assignedTo", "Responsável inválido.");
  else if (assignedTo !== null && isPrivate === true)
    fail("assignedTo", "Tarefa privada não tem responsável.");
  const recurrence = merged.recurrence ?? "none";
  if (typeof recurrence !== "string" || !recurrences.includes(recurrence))
    fail("recurrence", `Use um destes valores: ${recurrences.join(", ")}.`);
  let weekDays: number[] | null = null;
  if (recurrence === "custom_weekly") {
    const days = merged.weekDays;
    if (
      !Array.isArray(days) || !days.length ||
      days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    )
      fail("weekDays", "Escolha pelo menos um dia da semana (0 = domingo a 6 = sábado).");
    else weekDays = [...new Set(days as number[])].sort();
  }
  let recurrenceInterval: number | null = null;
  if (recurrence === "interval") {
    const days = Number(merged.recurrenceInterval);
    if (!Number.isInteger(days) || days < 1 || days > 365)
      fail("recurrenceInterval", "Informe um intervalo entre 1 e 365 dias.");
    else recurrenceInterval = days;
  }
  let recurrenceEndDate: string | null = null;
  if (recurrence !== "none" && merged.recurrenceEndDate) {
    if (!validDate(merged.recurrenceEndDate))
      fail("recurrenceEndDate", "Informe a data final no formato AAAA-MM-DD.");
    else if (validDate(merged.dueDate) && merged.recurrenceEndDate < merged.dueDate)
      fail("recurrenceEndDate", "A repetição precisa terminar depois da data da tarefa.");
    else recurrenceEndDate = merged.recurrenceEndDate;
  }
  const rawSubtasks = merged.subtasks ?? [];
  const subtasks: Raw[] = [];
  if (!Array.isArray(rawSubtasks) || rawSubtasks.length > 30)
    fail("subtasks", "Use uma lista de no máximo 30 subtarefas.");
  else
    rawSubtasks.forEach((item: Raw, i) => {
      const field = `subtasks[${i}]`;
      const itemTitle = typeof item?.title === "string" ? item.title.trim() : "";
      if (!itemTitle || itemTitle.length > 160)
        return fail(`${field}.title`, "Toda subtarefa precisa de um título (até 160 caracteres).");
      if (item.dueDate && !validDate(item.dueDate)) fail(`${field}.dueDate`, "Data inválida.");
      if (item.dueTime && !validTime(item.dueTime)) fail(`${field}.dueTime`, "Horário inválido.");
      subtasks.push({
        id: typeof item.id === "string" && item.id ? item.id.slice(0, 64) : `s${Date.now().toString(36)}${i}`,
        title: itemTitle,
        completed: item.completed === true,
        category: optionalString(item.category),
        dueDate: optionalString(item.dueDate),
        dueTime: optionalString(item.dueTime),
      });
    });
  const data = {
    title,
    description: (description as string).trim(),
    dueDate: merged.dueDate as string,
    dueTime: dueTime || null,
    category: category as string,
    isPrivate: isPrivate as boolean,
    assignedTo: assignedTo as string | null,
    subtasks,
    recurrence: recurrence as string,
    weekDays,
    recurrenceInterval,
    recurrenceEndDate,
  };
  return { data, errors };
}
