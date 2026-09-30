// A função da Ive (src/ive): as regras do app (recorrência, quem vê, quem muda, aprovação), a verificação de cada
// pedido e as ações faladas. Roda sobre lib/ (npm run build antes).
process.env.TZ = "America/Sao_Paulo";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash, createHmac, randomBytes } = require("node:crypto");
const agenda = require("../lib/ive/agenda");
const { createIveApp, sha256, dataFalada, horaFalada } = require("../lib/ive/app");

const AGORA = new Date(2026, 8, 30, 10, 0);  // quarta, 30/09/2026
const HOJE = "2026-09-30";

// ------------------------------------------------------------------ regras (espelho do app)

test("próxima data igual ao RecurrenceCalculator do app", () => {
  assert.equal(agenda.proximaData("2026-09-30", "daily"), "2026-10-01");
  assert.equal(agenda.proximaData("2026-09-30", "weekly"), "2026-10-07");
  assert.equal(agenda.proximaData("2026-09-30", "custom_weekly", [1, 4]), "2026-10-01");  // qua -> qui
  assert.equal(agenda.proximaData("2026-10-01", "custom_weekly", [1, 4]), "2026-10-05");  // qui -> seg
  assert.equal(agenda.proximaData("2026-01-31", "monthly"), "2026-03-03");                // como o Date do app
  assert.equal(agenda.proximaData("2026-09-30", "none"), "2026-09-30");
});

test("datas e horas faladas", () => {
  assert.equal(dataFalada("amanhã", HOJE), "2026-10-01");
  assert.equal(dataFalada("sexta", HOJE), "2026-10-02");
  assert.equal(dataFalada("terça-feira", HOJE), "2026-10-06");
  assert.equal(dataFalada("quarta", HOJE), "2026-10-07");        // hoje é quarta: a da semana que vem
  assert.equal(dataFalada("dia 5", HOJE), "2026-10-05");         // dia 5 já passou em setembro
  assert.equal(dataFalada("12/10", HOJE), "2026-10-12");
  assert.equal(dataFalada("2026-11-02", HOJE), "2026-11-02");
  assert.equal(dataFalada("quando der", HOJE), null);
  assert.equal(horaFalada("15h"), "15:00");
  assert.equal(horaFalada("15:30"), "15:30");
  assert.equal(horaFalada("3 da tarde"), "15:00");
  assert.equal(horaFalada("-"), null);
});

test("quem vê e quem muda, como no firestore.rules", () => {
  const t = { id: "t", title: "x", dueDate: HOJE, category: "home", completed: false, recurrence: "none", familyId: "f", createdBy: "ana" };
  const ana = { uid: "ana", familyId: "f", role: "parent", nome: "Ana" };
  const bia = { uid: "bia", familyId: "f", role: "parent", nome: "Bia" };
  const admin = { uid: "adm", familyId: "f", role: "admin", nome: "Adm" };
  const filho = { uid: "leo", familyId: "f", role: "dependent", nome: "Leo" };
  assert.equal(agenda.podeMudar(t, ana), "sim");
  assert.equal(agenda.podeMudar(t, bia), "nao");
  assert.equal(agenda.podeMudar(t, admin), "sim");
  assert.equal(agenda.podeMudar(t, filho), "aprovacao");
  assert.equal(agenda.visivel({ ...t, isPrivate: true }, bia), false);
  assert.equal(agenda.podeMudar({ ...t, isPrivate: true }, admin), "nao");
  assert.equal(agenda.visivel({ ...t, familyId: "outra" }, ana), false);
});

// ------------------------------------------------------------------ a função, com um banco em memória

function memoria() {
  const d = { tokens: [], pedidos: new Set(), pessoas: {}, tarefas: [], aprovacoes: [] };
  let seq = 0;
  return {
    d,
    async tokenPorHash(h) { return d.tokens.find((t) => t.hash === h) || null; },
    async marcarUso() {},
    async registrarPedido(id) { if (d.pedidos.has(id)) return false; d.pedidos.add(id); return true; },
    async pessoa(uid) { return d.pessoas[uid] || null; },
    async tarefas(p) { return d.tarefas.filter((t) => t.familyId === p.familyId && !t.deleted && (!t.isPrivate || t.createdBy === p.uid)).map((t) => ({ ...t })); },
    async tarefa(id) { const t = d.tarefas.find((x) => x.id === id); return t ? { ...t } : null; },
    async categorias() { return [{ id: "c-pets", label: "Pets" }]; },
    async criar(p, n) {
      const id = `n${++seq}`;
      d.tarefas.push({ id, familyId: p.familyId, createdBy: p.uid, completed: false, recurrence: "none", ...n, deleted: false });
      return id;
    },
    async mudar(_p, id, m) { Object.assign(d.tarefas.find((t) => t.id === id), m); },
    async pedirAprovacao(p, taskId, action, data) { d.aprovacoes.push({ by: p.uid, taskId, action, data }); },
    async criarToken(uid, nome, hash) { const id = `k${++seq}`; d.tokens.push({ id, uid, nome, hash, revogado: false }); return id; },
    async tokens(uid) { return d.tokens.filter((t) => t.uid === uid && !t.revogado); },
    async revogar(uid, id) { const t = d.tokens.find((x) => x.id === id && x.uid === uid); if (!t) return false; t.revogado = true; return true; },
  };
}

function tarefa(id, title, dueDate, extra = {}) {
  return { id, title, dueDate, dueTime: null, category: "home", completed: false, recurrence: "none", familyId: "f",
           createdBy: "ana", isPrivate: false, deleted: false, subtasks: [], ...extra };
}

async function servidor(repo) {
  const app = createIveApp({ repo, agora: () => AGORA, verificarLogin: async (id) => { if (!id.startsWith("login-")) throw new Error(); return id.slice(6); } });
  const srv = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  return { base: `http://127.0.0.1:${srv.address().port}/ive`, fechar: () => srv.close() };
}

function tokenDe(repo, uid) {
  const token = randomBytes(32).toString("base64url");
  repo.d.tokens.push({ id: `k-${uid}`, uid, nome: "Mac", hash: sha256(token), revogado: false });
  return token;
}

// Assina exatamente como a Ive (Ive-Desktop src/ive/connections/client.py)
async function pedir(base, token, metodo, caminho, corpo, mexer = {}) {
  const body = corpo === undefined ? undefined : Buffer.from(JSON.stringify(corpo));
  const carimbo = String(mexer.carimbo ?? Math.floor(AGORA.getTime() / 1000));
  const pedido = mexer.pedido || randomBytes(16).toString("hex");
  const chave = createHash("sha256").update(token).digest("hex");
  const mensagem = [carimbo, metodo, caminho, createHash("sha256").update(body || Buffer.alloc(0)).digest("hex"), pedido].join("\n");
  const r = await fetch(base + caminho, { method: metodo, body, headers: {
    Authorization: `Bearer ${token}`, "X-Ive-Timestamp": carimbo, "X-Ive-Request": pedido,
    "X-Ive-Signature": mexer.assinatura || createHmac("sha256", chave).update(mensagem).digest("hex"),
    ...(body ? { "Content-Type": "application/json" } : {}) } });
  return { status: r.status, corpo: await r.json().catch(() => ({})) };
}

function familia() {
  const repo = memoria();
  repo.d.pessoas = {
    ana: { uid: "ana", familyId: "f", role: "admin", nome: "Ana" },
    bia: { uid: "bia", familyId: "f", role: "parent", nome: "Bia" },
    leo: { uid: "leo", familyId: "f", role: "dependent", nome: "Leo" },
  };
  return repo;
}

test("só o pedido assinado, no horário e uma vez só passa", async () => {
  const repo = familia();
  const token = tokenDe(repo, "ana");
  const { base, fechar } = await servidor(repo);
  try {
    assert.equal((await pedir(base, token, "GET", "/tarefas")).status, 200);
    assert.equal((await pedir(base, token, "GET", "/tarefas", undefined, { assinatura: "b".repeat(64) })).status, 401);
    assert.equal((await pedir(base, token, "GET", "/tarefas", undefined, { carimbo: Math.floor(AGORA / 1000) - 3600 })).status, 401);
    const id = randomBytes(16).toString("hex");
    assert.equal((await pedir(base, token, "GET", "/tarefas", undefined, { pedido: id })).status, 200);
    assert.equal((await pedir(base, token, "GET", "/tarefas", undefined, { pedido: id })).status, 401);
    const ficha = await (await fetch(`${base}/ive.json`, { headers: { Authorization: `Bearer ${token}` } })).json();
    assert.equal(ficha.base, "https://us-central1-agendafamiliarkotlin.cloudfunctions.net/ive");
  } finally { fechar(); }
});

test("tarefas de hoje falam curto, com as atrasadas; privadas dos outros não aparecem", async () => {
  const repo = familia();
  repo.d.tarefas.push(tarefa("a", "Comprar leite", HOJE), tarefa("b", "Dentista", HOJE, { dueTime: "15:30" }),
    tarefa("c", "Pagar luz", "2026-09-28"), tarefa("d", "Segredo da Bia", HOJE, { isPrivate: true, createdBy: "bia" }),
    tarefa("e", "Feita", HOJE, { completed: true }), tarefa("f", "Mercado", "2026-10-01"));
  const token = tokenDe(repo, "ana");
  const { base, fechar } = await servidor(repo);
  try {
    const hoje = await pedir(base, token, "GET", "/tarefas?quando=hoje");
    assert.equal(hoje.corpo.fala, "Hoje, 2 tarefas da família: Dentista às 15h30 e Comprar leite. Tem 1 atrasada: Pagar luz.");
    const amanha = await pedir(base, token, "GET", "/tarefas?quando=amanha");
    assert.equal(amanha.corpo.fala, "Amanhã, 1 tarefa da família: Mercado.");
    assert.equal(amanha.corpo.vazio, false);
    assert.equal((await pedir(base, token, "GET", "/tarefas/pendentes")).corpo.total, 4);
  } finally { fechar(); }
});

test("concluir recorrente abre a próxima; o desfazer reabre e tira a próxima", async () => {
  const repo = familia();
  repo.d.tarefas.push(tarefa("r", "Tirar o lixo", HOJE, { recurrence: "weekly", dueTime: "20:00" }));
  const token = tokenDe(repo, "ana");
  const { base, fechar } = await servidor(repo);
  try {
    const feito = await pedir(base, token, "POST", "/tarefas/concluir", { tarefa: "tirar o lixo" });
    assert.equal(feito.corpo.fala, "Feito: Tirar o lixo concluída. A próxima é dia 7/10.");
    const proxima = repo.d.tarefas.find((t) => t.id === feito.corpo.proxima);
    assert.equal(proxima.dueDate, "2026-10-07");
    assert.equal(proxima.dueTime, "20:00");
    assert.equal(repo.d.tarefas.find((t) => t.id === "r").completed, true);
    const volta = await pedir(base, token, "POST", "/tarefas/r/reabrir", { proxima: feito.corpo.proxima });
    assert.equal(volta.status, 200);
    assert.equal(repo.d.tarefas.find((t) => t.id === "r").completed, false);
    assert.equal(proxima.deleted, true);
  } finally { fechar(); }
});

test("dependente vira pedido de aprovação; quem não criou não muda", async () => {
  const repo = familia();
  repo.d.tarefas.push(tarefa("a", "Lavar o carro", HOJE));
  const { base, fechar } = await servidor(repo);
  try {
    const leo = await pedir(base, tokenDe(repo, "leo"), "POST", "/tarefas/concluir", { tarefa: "lavar o carro" });
    assert.equal(leo.status, 202);
    assert.match(leo.corpo.fala, /Pedi pro administrador aprovar: concluir Lavar o carro/);
    assert.deepEqual(repo.d.aprovacoes, [{ by: "leo", taskId: "a", action: "complete", data: { completed: true } }]);
    assert.equal(repo.d.tarefas[0].completed, false);
    const bia = await pedir(base, tokenDe(repo, "bia"), "DELETE", "/tarefas?tarefa=lavar+o+carro");
    assert.equal(bia.status, 403);
  } finally { fechar(); }
});

test("criar, remarcar (e desfazer), apagar (e trazer de volta), nomes parecidos", async () => {
  const repo = familia();
  const token = tokenDe(repo, "ana");
  const { base, fechar } = await servidor(repo);
  try {
    const criada = await pedir(base, token, "POST", "/tarefas", { titulo: "Vacina do Rex", quando: "sexta", hora: "15h", categoria: "pets" });
    assert.equal(criada.corpo.fala, "Criei a tarefa Vacina do Rex pra sexta às 15h.");
    const t = repo.d.tarefas.find((x) => x.id === criada.corpo.id);
    assert.deepEqual([t.dueDate, t.dueTime, t.category], ["2026-10-02", "15:00", "c-pets"]);
    const mudou = await pedir(base, token, "PATCH", "/tarefas/remarcar", { tarefa: "vacina do rex", quando: "sábado" });
    assert.equal(mudou.corpo.fala, "Passei Vacina do Rex pra sábado às 15h.");
    await pedir(base, token, "PATCH", `/tarefas/${t.id}/remarcar`, { quando: mudou.corpo.data_anterior, hora: mudou.corpo.hora_anterior });
    assert.equal(t.dueDate, "2026-10-02");
    const apagada = await pedir(base, token, "DELETE", "/tarefas?tarefa=vacina+do+rex");
    assert.equal(apagada.corpo.fala, "Apaguei a tarefa Vacina do Rex.");
    assert.equal(t.deleted, true);
    await pedir(base, token, "POST", `/tarefas/${t.id}/restaurar`, {});
    assert.equal(t.deleted, false);
    repo.d.tarefas.push(tarefa("x", "Comprar pão", HOJE), tarefa("y", "Comprar pão de queijo", HOJE));
    const qual = await pedir(base, token, "POST", "/tarefas/concluir", { tarefa: "comprar" });
    assert.equal(qual.status, 409);
    assert.match(qual.corpo.fala, /Qual delas\?/);
    assert.equal((await pedir(base, token, "POST", "/tarefas/concluir", { tarefa: "comprar pão" })).status, 200);  // exata
  } finally { fechar(); }
});

test("tokens pelo app: cria (uma vez), lista sem hash, revoga", async () => {
  const repo = familia();
  const { base, fechar } = await servidor(repo);
  const chamar = (m, c, corpo, login = "login-ana") => fetch(base + c, { method: m,
    headers: { Authorization: `Bearer ${login}`, "Content-Type": "application/json" }, body: corpo && JSON.stringify(corpo) });
  try {
    assert.equal((await chamar("GET", "/tokens", undefined, "x")).status, 401);
    const criado = await (await chamar("POST", "/tokens", { nome: "Mac" })).json();
    assert.equal(repo.d.tokens[0].hash, sha256(criado.token));
    assert.deepEqual((await (await chamar("GET", "/tokens")).json()).tokens.map((t) => "hash" in t), [false]);
    assert.equal((await chamar("DELETE", `/tokens/${criado.id}`)).status, 204);
  } finally { fechar(); }
});
