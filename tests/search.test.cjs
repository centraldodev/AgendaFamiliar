const { test } = require("node:test");
const assert = require("node:assert/strict");
const { register } = require("node:module");
register("data:text/javascript," + encodeURIComponent("export async function resolve(s,c,n){try{return await n(s,c)}catch(e){if(s.startsWith('.'))return n(s+'.ts',c);throw e}}"));
const { searchTasks } = require("../src/utils/searchTasks.ts");
const { filterTasks } = require("../src/utils/filterTasks.ts");
const t = (extra) => ({ id: "1", title: "Reunião da escola", description: "", dueDate: "2026-10-31", completed: false, category: "school", familyId: "f", createdBy: "a", subtasks: [{ id: "s", title: "Levar boletim", completed: false }], ...extra });
test("busca ignora acento e maiúscula e olha subtarefas", () => {
  assert.equal(searchTasks([t()], "reuniao").length, 1);
  assert.equal(searchTasks([t()], "BOLETIM").length, 1);
  assert.equal(searchTasks([t()], "mercado").length, 0);
  assert.equal(searchTasks([t()], "  ").length, 1);
});
test("filtro Minhas: pendentes em que sou responsável", () => {
  const tasks = [t({ id: "1", assignedTo: "me" }), t({ id: "2", assignedTo: "other" }), t({ id: "3", assignedTo: "me", completed: true })];
  assert.deepEqual(filterTasks(tasks, "mine", "2026-10-31", new Date(), "me").map((x) => x.id), ["1"]);
});
