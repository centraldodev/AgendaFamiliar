import type { Task } from "../models/Task";
// Sem acento e sem maiúsculas: "reuniao" acha "Reunião".
const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Busca no título, na descrição e nas subtarefas. */
export function searchTasks(tasks: Task[], search: string) {
  const term = normalize(search.trim());
  if (!term) return tasks;
  return tasks.filter((task) =>
    [task.title, task.description, ...(task.subtasks ?? []).map((sub) => sub.title)].some((text) =>
      normalize(text ?? "").includes(term),
    ),
  );
}
