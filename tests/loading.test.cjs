const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createReadController,
} = require("../src/controllers/requests/createReadController.ts");
const { withReadTimeout } = require("../src/utils/withReadTimeout.ts");
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
function setup(load, extra = {}) {
  const data = [],
    errors = [];
  let settled = 0;
  const controller = createReadController({
    load,
    onData: (v) => data.push(v),
    onError: (e) => errors.push(e),
    onSettled: () => settled++,
    isCurrent: () => true,
    timeoutMs: 50,
    ...extra,
  });
  return {
    controller,
    data,
    errors,
    get settled() {
      return settled;
    },
  };
}
test("encerrar a lista antiga não invalida o carregamento da nova sessão", async () => {
  let session = 1;
  const oldRequest = deferred(),
    sessionRequest = deferred();
  const old = setup(() => oldRequest.promise, {
    isCurrent: () => session === 1,
  });
  const waiting = old.controller.refresh();
  session = 2;
  const bootstrap = withReadTimeout(sessionRequest.promise, 100).then(
    (value) => {
      if (session === 2) return value;
    },
  );
  old.controller.close();
  sessionRequest.resolve({ uid: "new-user" });
  oldRequest.resolve(["private-old-user"]);
  assert.deepEqual(await bootstrap, { uid: "new-user" });
  await waiting;
  assert.deepEqual(old.data, []);
  assert.equal(old.settled, 0);
  assert.equal(session, 2);
});
test("consulta travada encerra loading, informa erro e permite nova tentativa", async () => {
  let first = true;
  const state = setup(
    () => (first ? new Promise(() => {}) : Promise.resolve(["task"])),
    { timeoutMs: 10 },
  );
  await assert.rejects(state.controller.refresh(), { code: "read/timeout" });
  assert.equal(state.settled, 1);
  assert.equal(state.errors[0].code, "read/timeout");
  first = false;
  await state.controller.refresh();
  assert.deepEqual(state.data, [["task"]]);
  assert.equal(state.errors.at(-1), null);
  assert.equal(state.settled, 2);
});
test("polling não acumula chamadas enquanto a consulta está em andamento", async () => {
  let calls = 0;
  const request = deferred();
  const state = setup(() => {
    calls++;
    return request.promise;
  });
  const first = state.controller.refresh(),
    second = state.controller.refresh();
  assert.equal(first, second);
  request.resolve(["task"]);
  await first;
  assert.equal(calls, 1);
  assert.equal(state.settled, 1);
});
test("resposta antiga não sobrescreve atualização após salvar tarefa", async () => {
  const old = deferred(),
    fresh = deferred();
  let calls = 0;
  const state = setup(() => (++calls === 1 ? old.promise : fresh.promise));
  const first = state.controller.refresh();
  await Promise.resolve();
  const second = state.controller.refresh(true);
  fresh.resolve(["new-task"]);
  await second;
  old.resolve(["stale-task"]);
  await first;
  assert.deepEqual(state.data, [["new-task"]]);
  assert.equal(state.settled, 1);
});
test("falha de rede preserva tarefas já exibidas e nova resposta limpa erro", async () => {
  let fail = false;
  const state = setup(() =>
    fail ? Promise.reject(new Error("offline")) : Promise.resolve(["task"]),
  );
  await state.controller.refresh();
  fail = true;
  await assert.rejects(state.controller.refresh(), /offline/);
  assert.deepEqual(state.data, [["task"]]);
  fail = false;
  await state.controller.refresh();
  assert.equal(state.errors.at(-1), null);
});
test("perfil que não responde também tem prazo limitado", async () => {
  await assert.rejects(withReadTimeout(new Promise(() => {}), 10), {
    code: "read/timeout",
  });
});
