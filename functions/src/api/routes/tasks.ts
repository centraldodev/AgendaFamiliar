import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { isExpiredCompletedTask } from "../../shared/isExpiredCompletedTask";
import { advanceRecurringTask } from "../../services/advanceRecurringTask";
import { resolveAuthorNames, serializeTask } from "../../services/serializeTask";
import { toggleSubtask } from "../../services/toggleSubtask";
import {
  actorOf,
  canComplete,
  canCreatePrivate,
  canDelete,
  canEdit,
  canRead,
  canRestore,
  type Actor,
} from "../../shared/taskPermissions";
import { validateTaskBody } from "../../services/validateTaskBody";
import { ApiError, type RouteContext, type Router } from "../http";
type Raw = Record<string, unknown>;
const forbidden = (message: string) => new ApiError(403, "permission-denied", message);
async function requireActor(uid: string): Promise<Actor> {
  const actor = actorOf(uid, (await db.doc(`users/${uid}`).get()).data());
  if (!actor) throw new ApiError(409, "no-family", "Entre em uma família primeiro.");
  return actor;
}
// Tarefa de outra família, privada de outra pessoa ou excluída responde 404 (não vaza que existe).
async function loadTask(id: string, actor: Actor) {
  if (!id || id.length > 128) throw new ApiError(404, "not-found", "Tarefa não encontrada.");
  const snap = await db.doc(`tasks/${id}`).get();
  const task = snap.data();
  if (!task || !canRead(task, actor)) throw new ApiError(404, "not-found", "Tarefa não encontrada.");
  return { ref: snap.ref, task };
}
async function respondTask(ctx: RouteContext, id: string, status = 200) {
  const snap = await db.doc(`tasks/${id}`).get();
  const task = snap.data() ?? {};
  const names = await resolveAuthorNames([task]);
  ctx.res.status(status).json(serializeTask(id, task, names));
}
// O responsável precisa ser da mesma família.
async function assertAssignee(assignedTo: string | null, actor: Actor) {
  if (!assignedTo) return;
  const member = (await db.doc(`users/${assignedTo}`).get()).data();
  if (member?.familyId !== actor.familyId)
    throw new ApiError(422, "validation-failed", "Confira os campos da tarefa.", [
      { field: "assignedTo", message: "O responsável precisa ser da família." },
    ]);
}
const isDate = (value: string | undefined) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
export function taskRoutes(router: Router) {
  // GET /v1/tasks?from=AAAA-MM-DD&to=AAAA-MM-DD&status=open|done|all&category=...
  router.add("GET", "/v1/tasks", async (ctx) => {
    const actor = await requireActor(ctx.caller.uid);
    const { from, to, status = "all", category } = ctx.query;
    if (!isDate(from) || !isDate(to))
      throw new ApiError(400, "invalid-argument", "Use datas no formato AAAA-MM-DD em from e to.");
    if (!["open", "done", "all"].includes(status))
      throw new ApiError(400, "invalid-argument", "status deve ser open, done ou all.");
    const docs = await db.collection("tasks").where("familyId", "==", actor.familyId).get();
    const visible = docs.docs.filter((doc) => {
      const t = doc.data();
      if (!canRead(t, actor) || isExpiredCompletedTask(t)) return false;
      const done = t.completed === true || t.skipped === true;
      if (status === "open" && done) return false;
      if (status === "done" && !done) return false;
      if (category && t.category !== category) return false;
      const due = String(t.dueDate ?? "");
      return (!from || due >= from) && (!to || due <= to);
    });
    const names = await resolveAuthorNames(visible.map((doc) => doc.data()));
    const tasks = visible
      .map((doc) => serializeTask(doc.id, doc.data(), names))
      .sort((a, b) => `${a.dueDate} ${a.dueTime ?? ""}`.localeCompare(`${b.dueDate} ${b.dueTime ?? ""}`));
    ctx.res.json({ tasks });
  });
  router.add("GET", "/v1/tasks/:id", async (ctx) => {
    const actor = await requireActor(ctx.caller.uid);
    await loadTask(ctx.params.id, actor);
    await respondTask(ctx, ctx.params.id);
  });
  router.add("POST", "/v1/tasks", async (ctx) => {
    const actor = await requireActor(ctx.caller.uid);
    const data = validateTaskBody(ctx.body);
    if (data.isPrivate && !canCreatePrivate(actor))
      throw forbidden("Somente administradores criam tarefas privadas.");
    await assertAssignee(data.assignedTo, actor);
    const ref = await db.collection("tasks").add({
      ...data,
      subtasks: data.subtasks.map((item) => ({ ...item, completed: false })),
      familyId: actor.familyId,
      createdBy: actor.uid,
      lastModifiedBy: actor.uid,
      completed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    ctx.res.set("Location", `/v1/tasks/${ref.id}`);
    await respondTask(ctx, ref.id, 201);
  });
  router.add("PATCH", "/v1/tasks/:id", async (ctx) => {
    const actor = await requireActor(ctx.caller.uid);
    const { ref, task } = await loadTask(ctx.params.id, actor);
    if (!canEdit(task, actor)) throw forbidden("Somente administradores editam tarefas.");
    const data = validateTaskBody(ctx.body, task as Raw);
    const owner = task.createdBy === actor.uid;
    // Igual ao firestore.rules: nunca torna privada a tarefa de outra pessoa.
    if (data.isPrivate && !owner && task.isPrivate !== true)
      throw forbidden("Só quem criou a tarefa pode torná-la privada.");
    await assertAssignee(data.assignedTo, actor);
    await ref.update({ ...data, lastModifiedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    await respondTask(ctx, ref.id);
  });
  router.add("DELETE", "/v1/tasks/:id", async (ctx) => {
    const actor = await requireActor(ctx.caller.uid);
    const { ref, task } = await loadTask(ctx.params.id, actor);
    if (!canDelete(task, actor)) throw forbidden("Somente administradores excluem tarefas.");
    await ref.delete();
    ctx.res.status(204).end();
  });
  // Concluir ou pular: recorrente arquiva esta e cria a próxima (como o app).
  for (const action of ["complete", "skip"] as const)
    router.add("POST", `/v1/tasks/:id/${action}`, async (ctx) => {
      const actor = await requireActor(ctx.caller.uid);
      const { ref, task } = await loadTask(ctx.params.id, actor);
      if (!canComplete(task, actor)) throw forbidden("Sua conta não tem permissão para esta ação.");
      if (task.completed === true || task.skipped === true)
        throw new ApiError(409, "already-closed", "Esta tarefa já foi encerrada.");
      if ((task.recurrence ?? "none") !== "none") {
        const next = await advanceRecurringTask(actor.uid, ref.id, action);
        const snap = await ref.get();
        const names = await resolveAuthorNames([snap.data() ?? {}]);
        ctx.res.json({ task: serializeTask(ref.id, snap.data() ?? {}, names), ...next });
        return;
      }
      await ref.update({
        [action === "complete" ? "completed" : "skipped"]: true,
        lastModifiedBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const snap = await ref.get();
      const names = await resolveAuthorNames([snap.data() ?? {}]);
      ctx.res.json({ task: serializeTask(ref.id, snap.data() ?? {}, names), nextTaskId: null, nextDueDate: null });
    });
  router.add("POST", "/v1/tasks/:id/reopen", async (ctx) => {
    const actor = await requireActor(ctx.caller.uid);
    const { ref, task } = await loadTask(ctx.params.id, actor);
    if (task.completed !== true && task.skipped !== true)
      throw new ApiError(409, "not-closed", "Esta tarefa já está aberta.");
    if (!canRestore(task, actor)) throw forbidden("Somente administradores reabrem tarefas.");
    await ref.update({ completed: false, skipped: false, lastModifiedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    await respondTask(ctx, ref.id);
  });
  // Marca ou desmarca uma subtarefa: { "completed": true }. A última conclui a tarefa
  // (recorrente: cria a próxima), igual ao app.
  router.add("PATCH", "/v1/tasks/:id/subtasks/:subtaskId", async (ctx) => {
    const actor = await requireActor(ctx.caller.uid);
    const { ref } = await loadTask(ctx.params.id, actor);
    if (typeof ctx.body.completed !== "boolean")
      throw new ApiError(422, "validation-failed", "Envie completed: true ou false.", [
        { field: "completed", message: "Use true ou false." },
      ]);
    const next = await toggleSubtask(actor.uid, ref.id, ctx.params.subtaskId, ctx.body.completed);
    const snap = await ref.get();
    const names = await resolveAuthorNames([snap.data() ?? {}]);
    ctx.res.json({ task: serializeTask(ref.id, snap.data() ?? {}, names), ...next });
  });
}
