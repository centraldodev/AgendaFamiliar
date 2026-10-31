const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canReadTask } = require("../lib/visibility");
const task = { familyId: "family-a", createdBy: "alice" };
test("família lê tarefas compartilhadas e registros antigos", () => {
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
test("não entrega dados de outra família nem tarefas excluídas", () => {
  assert.equal(canReadTask(task, "alice", "family-b"), false);
  assert.equal(
    canReadTask({ ...task, deletedAt: {} }, "alice", "family-a"),
    false,
  );
});
