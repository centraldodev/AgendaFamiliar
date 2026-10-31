import type { TaskInput } from "../models/TaskInput";
import { validateTask } from "../../functions/src/shared/validateTask.ts";
// Mesma validação do backend; o app mostra o primeiro problema encontrado.
export function validateTaskInput(input: TaskInput) {
  const { errors } = validateTask(input as unknown as Record<string, unknown>);
  if (errors.length) throw new Error(errors[0].message);
}
