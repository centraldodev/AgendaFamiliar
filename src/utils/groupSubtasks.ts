import { categories, categoryLabel } from "../constants/categories";
import type { Subtask } from "../models/Subtask";
// Agrupa na ordem das categorias do app; "Sem categoria" fica por último.
export function groupSubtasks(subtasks: Subtask[]) {
  const groups = new Map<string, Subtask[]>();
  for (const item of subtasks) {
    const key = item.category || "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const order = Object.keys(categories);
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const rank = (key: string) =>
        !key ? Infinity : order.includes(key) ? order.indexOf(key) : order.length;
      return rank(a) - rank(b);
    })
    .map(([key, items]) => ({
      key,
      label: key ? categoryLabel(key) : "Sem categoria",
      items,
    }));
}
