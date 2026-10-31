const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Router, ApiError } = require("../lib/api/http");
const { rateLimit } = require("../lib/api/rateLimit");
const { validateTaskBody } = require("../lib/services/validateTaskBody");

const noop = async () => {};
test("roteador casa parâmetros e distingue 404 de 405", () => {
  const router = new Router().add("GET", "/v1/tasks/:id", noop).add("DELETE", "/v1/tasks/:id", noop);
  assert.deepEqual(router.match("GET", "/v1/tasks/abc%20d").params, { id: "abc d" });
  assert.throws(() => router.match("GET", "/v1/nada"), (e) => e instanceof ApiError && e.status === 404);
  assert.throws(
    () => router.match("PUT", "/v1/tasks/x"),
    (e) => e.status === 405 && e.allowed.join() === "GET,DELETE",
  );
});

test("rate limit bloqueia acima de 120 por minuto e libera na janela seguinte", () => {
  const now = 1_000_000;
  for (let i = 0; i < 120; i++) rateLimit("u1", now);
  assert.throws(() => rateLimit("u1", now + 10), (e) => e.status === 429 && e.retryAfter >= 1);
  assert.equal(rateLimit("u1", now + 60_000).remaining, 119);
});

test("validação aceita tarefa mínima e preenche padrões", () => {
  const data = validateTaskBody({ title: "  Mercado ", dueDate: "2026-11-02", category: "home" });
  assert.equal(data.title, "Mercado");
  assert.equal(data.recurrence, "none");
  assert.equal(data.dueTime, null);
  assert.equal(data.isPrivate, false);
});

test("validação lista todos os campos com erro", () => {
  try {
    validateTaskBody({ title: "", dueDate: "2026-02-30", dueTime: "25:00", recurrence: "interval", extra: 1 });
    assert.fail();
  } catch (e) {
    assert.equal(e.status, 422);
    assert.deepEqual(e.errors.map((x) => x.field).sort(), ["category", "dueDate", "dueTime", "extra", "recurrenceInterval", "title"]);
  }
});

test("edição parcial usa a tarefa atual e limpa campos de outra recorrência", () => {
  const base = { title: "Remédio", dueDate: "2026-11-01", category: "health", recurrence: "interval", recurrenceInterval: 15 };
  const data = validateTaskBody({ recurrence: "custom_weekly", weekDays: [5, 1, 1] }, base);
  assert.equal(data.title, "Remédio");
  assert.deepEqual(data.weekDays, [1, 5]);
  assert.equal(data.recurrenceInterval, null);
  assert.throws(() => validateTaskBody({ recurrenceEndDate: "2026-10-01" }, base), (e) => e.status === 422);
});
