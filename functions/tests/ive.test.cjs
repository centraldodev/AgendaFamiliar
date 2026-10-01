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
    async pedirAprovacao(p, taskId, action, data) {
      d.aprovacoes.push({ id: `a${++seq}`, familyId: p.familyId, requestedBy: p.uid, userName: p.nome, by: p.uid, taskId, action, data, status: "pending" });
    },
    async membros(familyId) {
      return Object.values(d.pessoas).filter((x) => x.familyId === familyId).map((x) => ({ uid: x.uid, nome: x.nome, role: x.role }));
    },
    async mudarMembro(uid, m) {
      const x = d.pessoas[uid];
      if (m.displayName !== undefined) x.nome = m.displayName;
      if (m.familyId !== undefined) x.familyId = m.familyId;
      if (m.role !== undefined) x.role = m.role;
    },
    async aprovacoes(familyId) { return d.aprovacoes.filter((a) => a.familyId === familyId && a.status === "pending"); },
    async responderAprovacao(id, status) { d.aprovacoes.find((a) => a.id === id).status = status; },
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
    assert.deepEqual(repo.d.aprovacoes.map(({ by, taskId, action, data }) => ({ by, taskId, action, data })),
                     [{ by: "leo", taskId: "a", action: "complete", data: { completed: true } }]);
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
    assert.equal(criada.corpo.fala, "Criei a tarefa Vacina do Rex pra sexta às 15h, em Pets.");
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
    assert.equal(qual.status, 422);
    assert.equal(qual.corpo.falta, "qual");
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

test("painel: os dias todos numa leitura só, iguais à rota", async () => {
  const repo = familia();
  const token = tokenDe(repo, "ana");
  const hoje = AGORA.toISOString().slice(0, 10);
  repo.d.tarefas.push(tarefa("t1", "comprar leite", hoje), tarefa("t2", "dentista", "2020-01-01"));
  let leituras = 0;
  const ler = repo.tarefas;
  repo.tarefas = async (p) => { leituras += 1; return ler(p); };
  const { base, fechar } = await servidor(repo);
  try {
    const painel = await pedir(base, token, "GET", "/painel");
    assert.equal(painel.status, 200);
    assert.equal(leituras, 1);
    const achar = (acao, quando) => painel.corpo.respostas.find((r) => r.acao === acao && r.args.quando === quando).dados;
    assert.deepEqual(achar("tarefas", "hoje"), (await pedir(base, token, "GET", "/tarefas?quando=hoje")).corpo);
    assert.deepEqual(achar("tarefas", undefined), achar("tarefas", "hoje"));  // sem dia: hoje
    assert.deepEqual(achar("tarefas", "amanha"), (await pedir(base, token, "GET", "/tarefas?quando=amanha")).corpo);
    assert.ok(painel.corpo.respostas.some((r) => r.acao === "tarefas_pendentes"));
  } finally { fechar(); }
});

// ------------------------------------------------------------------ criar, editar, pular, aprovações e membros (v4)

test("criar: pergunta nome, data e categoria; sem hora, a de agora; pública se não disser", async () => {
  const repo = familia();
  const token = tokenDe(repo, "ana");
  const { base, fechar } = await servidor(repo);
  try {
    const passos = [[{}, "titulo"], [{ titulo: "dentista da bia" }, "quando"], [{ quando: "semana que vem talvez" }, "quando"],
                    [{ quando: "amanhã" }, "categoria"]];
    let corpo = {};
    for (const [mais, falta] of passos) {
      corpo = { ...corpo, ...mais };
      const r = await pedir(base, token, "POST", "/tarefas", corpo);
      assert.equal(r.status, 422, JSON.stringify(r.corpo));
      assert.equal(r.corpo.falta, falta);
    }
    const sugestao = await pedir(base, token, "POST", "/tarefas", corpo);
    assert.equal(sugestao.corpo.fala, "Qual a categoria? Pode ser Saúde?");  // pelo título
    assert.equal(repo.d.tarefas.length, 0);
    const r = await pedir(base, token, "POST", "/tarefas", { ...corpo, categoria: "pode ser",
      recorrencia: "toda segunda e quarta", subtarefas: "levar a carteirinha e o exame" });
    assert.equal(r.status, 201);
    const t = repo.d.tarefas[0];
    assert.equal(t.title, "Dentista da bia");
    assert.equal(t.dueTime, "10:00");                    // a hora de agora (AGORA é 10h)
    assert.equal(t.isPrivate, false);
    assert.deepEqual([t.category, t.recurrence, t.weekDays], ["health", "custom_weekly", [1, 3]]);
    assert.deepEqual(t.subtasks.map((s) => [s.title, s.completed, s.category]), [["Levar a carteirinha", false, "health"], ["O exame", false, "health"]]);
    assert.match(r.corpo.fala, /^Criei a tarefa Dentista da bia pra amanhã às 10h, em Saúde, toda segunda e quarta, com 2 subtarefas\.$/);
    const privada = await pedir(base, token, "POST", "/tarefas", { titulo: "presente", quando: "hoje", categoria: "família", privada: "só pra mim" });
    assert.match(privada.corpo.fala, /só pra você\.$/);
  } finally { fechar(); }
});

test("editar: acha pelo nome, pergunta qual entre parecidas (pela data) e o que muda; desfazer volta", async () => {
  const repo = familia();
  const token = tokenDe(repo, "ana");
  repo.d.tarefas.push(tarefa("p1", "Comprar pão", "2026-09-30", { dueTime: "08:00" }), tarefa("p2", "Comprar pão", "2026-10-02"));
  const { base, fechar } = await servidor(repo);
  try {
    const qual = await pedir(base, token, "PATCH", "/tarefas/editar", { tarefa: "comprar pão" });
    assert.equal(qual.corpo.falta, "qual");
    assert.equal(qual.corpo.fala, "Tem 2 parecidas: Comprar pão hoje às 8h e Comprar pão sexta. Qual delas?");
    const oQue = await pedir(base, token, "PATCH", "/tarefas/editar", { tarefa: "comprar pão", qual: "a de sexta" });
    assert.equal(oQue.corpo.falta, "o_que");
    const r = await pedir(base, token, "PATCH", "/tarefas/editar", { tarefa: "comprar pão", qual: "a de sexta", o_que: "pra sábado às 9h" });
    assert.equal(r.status, 200, JSON.stringify(r.corpo));
    const p2 = repo.d.tarefas.find((t) => t.id === "p2");
    assert.deepEqual([p2.dueDate, p2.dueTime], ["2026-10-03", "09:00"]);
    assert.equal(repo.d.tarefas.find((t) => t.id === "p1").dueDate, "2026-09-30");  // a outra não mudou
    const privada = await pedir(base, token, "PATCH", "/tarefas/editar", { tarefa: "comprar pão", qual: "a primeira", privada: "sim" });
    assert.match(privada.corpo.fala, /só pra você/);
    const volta = { id: "p1", titulo: privada.corpo.titulo_anterior, quando: privada.corpo.data_anterior, hora: privada.corpo.hora_anterior,
                    categoria: privada.corpo.categoria_anterior, privada: privada.corpo.privada_anterior,
                    recorrencia: privada.corpo.recorrencia_anterior, dono: privada.corpo.dono_anterior };
    await pedir(base, token, "PATCH", "/tarefas/p1/voltar", volta);
    assert.equal(repo.d.tarefas.find((t) => t.id === "p1").isPrivate, false);
  } finally { fechar(); }
});

test("pular: só recorrente, vai para a próxima data; dependente pede aprovação", async () => {
  const repo = familia();
  repo.d.tarefas.push(tarefa("r", "Regar as plantas", "2026-09-30", { recurrence: "weekly" }), tarefa("u", "Pagar luz", "2026-09-30"));
  const { base, fechar } = await servidor(repo);
  try {
    const ana = tokenDe(repo, "ana");
    const r = await pedir(base, ana, "POST", "/tarefas/pular", { tarefa: "regar as plantas" });
    assert.equal(r.corpo.fala, "Pulei Regar as plantas. A próxima é dia 7/10.");
    assert.equal(repo.d.tarefas[0].dueDate, "2026-10-07");
    assert.equal((await pedir(base, ana, "POST", "/tarefas/pular", { tarefa: "pagar luz" })).status, 409);
    const leo = await pedir(base, tokenDe(repo, "leo"), "POST", "/tarefas/pular", { tarefa: "regar" });
    assert.equal(leo.status, 202);
  } finally { fechar(); }
});

test("aprovações: só o admin vê e responde; aprovar faz o que foi pedido", async () => {
  const repo = familia();
  repo.d.tarefas.push(tarefa("a", "Lavar o carro", "2026-09-30", { recurrence: "weekly" }), tarefa("b", "Lixo", "2026-09-30"));
  const { base, fechar } = await servidor(repo);
  try {
    const leo = tokenDe(repo, "leo");
    await pedir(base, leo, "POST", "/tarefas/concluir", { tarefa: "lavar o carro" });
    await pedir(base, leo, "DELETE", "/tarefas?tarefa=lixo");
    assert.equal((await pedir(base, tokenDe(repo, "bia"), "GET", "/aprovacoes")).status, 403);
    const ana = tokenDe(repo, "ana");
    const lista = await pedir(base, ana, "GET", "/aprovacoes");
    assert.equal(lista.corpo.fala, "Tem 2 pedidos de aprovação: Leo quer concluir Lavar o carro e Leo quer apagar Lixo.");
    const qual = await pedir(base, ana, "POST", "/aprovacoes/responder", { decisao: "aprova", pedido: "leo" });
    assert.equal(qual.corpo.falta, "pedido");
    const ok = await pedir(base, ana, "POST", "/aprovacoes/responder", { decisao: "aprova", pedido: "lavar o carro" });
    assert.equal(ok.corpo.fala, "Aprovado: Leo pode concluir Lavar o carro.");
    assert.equal(repo.d.tarefas.find((t) => t.id === "a").completed, true);
    assert.equal(repo.d.tarefas.filter((t) => t.title === "Lavar o carro").length, 2);  // recorrente: a próxima
    const nao = await pedir(base, ana, "POST", "/aprovacoes/responder", { decisao: "recusa" });  // sobrou um
    assert.equal(nao.corpo.fala, "Recusado: Leo não vai apagar Lixo.");
    assert.equal(repo.d.tarefas.find((t) => t.id === "b").deleted, false);
    assert.deepEqual(repo.d.aprovacoes.map((a) => a.status), ["approved", "rejected"]);
  } finally { fechar(); }
});

test("membros: lista, renomeia (admin ou a própria pessoa), tira da família e traz de volta", async () => {
  const repo = familia();
  const { base, fechar } = await servidor(repo);
  try {
    const ana = tokenDe(repo, "ana");
    assert.equal((await pedir(base, ana, "GET", "/membros")).corpo.fala, "Na família: Ana (admin), Bia (responsável) e Leo (dependente).");
    const nome = await pedir(base, ana, "PATCH", "/membros/nome", { membro: "leo", nome: "leonardo" });
    assert.equal(nome.corpo.fala, "Pronto: Leo agora é Leonardo.");
    assert.equal((await pedir(base, tokenDe(repo, "bia"), "PATCH", "/membros/nome", { membro: "leonardo", nome: "x" })).status, 403);
    assert.equal((await pedir(base, tokenDe(repo, "bia"), "PATCH", "/membros/nome", { membro: "bia", nome: "beatriz" })).status, 200);
    assert.equal((await pedir(base, ana, "DELETE", "/membros?membro=ana")).status, 409);  // sair, só pelo app
    const saiu = await pedir(base, ana, "DELETE", "/membros?membro=leonardo");
    assert.equal(saiu.corpo.fala, "Tirei Leonardo da família.");
    assert.equal(repo.d.pessoas.leo.familyId, null);
    await pedir(base, ana, "POST", "/membros/leo/restaurar", { papel: saiu.corpo.papel_anterior });
    assert.deepEqual([repo.d.pessoas.leo.familyId, repo.d.pessoas.leo.role], ["f", "dependent"]);
  } finally { fechar(); }
});
