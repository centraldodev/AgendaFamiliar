import { ApiError } from "../api/http";
import { taskFields, validateTask } from "../shared/validateTask";
type Raw = Record<string, unknown>;
/**
 * Valida o corpo de criação (tudo) ou de edição (`base` = tarefa atual, o corpo
 * só traz o que muda) e devolve os campos prontos para gravar.
 */
export function validateTaskBody(body: Raw, base: Raw = {}) {
  const unknown = Object.keys(body)
    .filter((key) => !(taskFields as readonly string[]).includes(key))
    .map((field) => ({ field, message: "Campo desconhecido." }));
  const { data, errors } = validateTask({ ...base, ...body });
  if (unknown.length || errors.length)
    throw new ApiError(422, "validation-failed", "Confira os campos da tarefa.", [...unknown, ...errors]);
  return data;
}
