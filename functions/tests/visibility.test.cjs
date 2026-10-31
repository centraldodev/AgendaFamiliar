const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canReadTask } = require("../lib/middlewares/canReadTask");
const task = { familyId: "family-a", createdBy: "alice" };
test("família lê tarefas compartilhadas", () => {
  assert.equal(canReadTask(task, "bob", "family-a"), true);
  assert.equal(
    canReadTask({ ...task, isPrivate: false }, "bob", "family-a"),
    true,
  );
});
test("tarefa privada fica restrita ao criador, inclusive para administradores", () => {
  assert.equal(
    canReadTask({ ...task, isPrivate: true }, "bob", "family-a"),
    false,
  );
  assert.equal(
    canReadTask({ ...task, isPrivate: true }, "alice", "family-a"),
    true,
  );
  assert.equal(
    canReadTask({ familyId: "family-a", isPrivate: true }, "bob", "family-a"),
    false,
  );
});
test("não entrega dados de outra família", () => {
  assert.equal(canReadTask(task, "alice", "family-b"), false);
});
test("concluída há mais de uma semana expira; recentes e pendentes não", () => {
  const { isExpiredCompletedTask } = require("../lib/middlewares/isExpiredCompletedTask");
  const day = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 9, 31);
  const at = (days) => ({ toMillis: () => now - days * day });
  assert.equal(isExpiredCompletedTask({ completed: true, updatedAt: at(8) }, now), true);
  assert.equal(isExpiredCompletedTask({ completed: true, updatedAt: at(6) }, now), false);
  assert.equal(isExpiredCompletedTask({ completed: false, updatedAt: at(30) }, now), false);
  assert.equal(isExpiredCompletedTask({ completed: true }, now), false);
});
test("aviso de vencimento: só na janela, só pendentes, no horário de Brasília", () => {
  const { isReminderDue, reminderKey } = require("../lib/services/dueReminder");
  // 31/10/2026 15:10 em Brasília (UTC-3) = 18:10 UTC.
  const now = new Date(Date.UTC(2026, 9, 31, 18, 10));
  const t = (extra) => ({ dueDate: "2026-10-31", completed: false, ...extra });
  assert.equal(isReminderDue(t({ dueTime: "15:00" }), now), true);
  assert.equal(isReminderDue(t({ dueTime: "15:30" }), now), false);
  assert.equal(isReminderDue(t({ dueTime: "13:00" }), now), false);
  assert.equal(isReminderDue(t({ dueTime: "15:00", completed: true }), now), false);
  assert.equal(isReminderDue(t({ dueTime: null }), new Date(Date.UTC(2026, 9, 31, 11, 5))), true);
  assert.equal(reminderKey(t({ dueTime: null })), "2026-10-31 08:00");
  assert.notEqual(reminderKey(t({ dueTime: "15:00" })), reminderKey(t({ dueDate: "2026-11-01", dueTime: "15:00" })));
});
