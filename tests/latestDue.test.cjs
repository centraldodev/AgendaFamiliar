const test = require("node:test");
const assert = require("node:assert");
const { latestDue } = require("../functions/src/shared/validateTask.ts");
test("subtarefa mais tardia empurra o vencimento da principal", () => {
  const subs = [{ dueDate: "2026-11-01" }, { dueDate: "2026-11-02", dueTime: "09:00" }];
  assert.deepStrictEqual(latestDue("2026-11-01", null, subs), { dueDate: "2026-11-02", dueTime: "09:00" });
});
test("principal já mais tardia fica como está", () => {
  assert.deepStrictEqual(latestDue("2026-11-05", "10:00", [{ dueDate: "2026-11-02" }]), { dueDate: "2026-11-05", dueTime: "10:00" });
});
test("mesmo dia: horário mais tardio ou sem horário (fim do dia) vence", () => {
  assert.deepStrictEqual(latestDue("2026-11-02", "08:00", [{ dueDate: "2026-11-02", dueTime: "18:00" }]), { dueDate: "2026-11-02", dueTime: "18:00" });
  assert.deepStrictEqual(latestDue("2026-11-02", "08:00", [{ dueDate: "2026-11-02" }]), { dueDate: "2026-11-02", dueTime: null });
  assert.deepStrictEqual(latestDue("2026-11-02", null, [{ dueDate: "2026-11-02", dueTime: "18:00" }]), { dueDate: "2026-11-02", dueTime: null });
});
test("subtarefas sem data não mudam nada", () => {
  assert.deepStrictEqual(latestDue("2026-11-02", "08:00", [{ dueDate: null }, {}]), { dueDate: "2026-11-02", dueTime: "08:00" });
});
