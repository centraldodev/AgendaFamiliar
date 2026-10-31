import type { TaskInput } from "../models/TaskInput";
export function validateTaskInput(input: TaskInput) {
  if (!input.title.trim()) throw new Error("Informe o título da tarefa.");
  const parsed = new Date(`${input.dueDate}T12:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ||
    isNaN(parsed.getTime()) ||
    `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` !==
      input.dueDate
  )
    throw new Error("Informe uma data válida no formato AAAA-MM-DD.");
  if (input.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.dueTime))
    throw new Error("Informe o horário no formato HH:MM.");
}
