"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = exports.Recusa = void 0;
exports.caminhoDaAcao = caminhoDaAcao;
exports.assinatura = assinatura;
exports.dataFalada = dataFalada;
exports.horaFalada = horaFalada;
exports.createIveApp = createIveApp;
/**
 * A função "ive": a Agenda Familiar controlada pela assistente Ive (protocolo ive-app/1; Ive-Desktop
 * docs/PROTOCOLO_APPS.md). Só as rotas da Ive, com a própria verificação; as outras funções não mudam.
 *
 * Cada pedido da Ive: token (Bearer, guardado só como SHA-256) -> usuário; assinatura HMAC-SHA256 (chave = SHA-256
 * do token) sobre carimbo, método, caminho, corpo e X-Ive-Request; carimbo de até 5 min; X-Ive-Request uma vez só.
 * As regras são as do app: a família da pessoa, privadas só de quem criou, mudar só quem criou ou o admin, e o
 * dependente vira pedido de aprovação (como no app). A Ive fala nomes: o app acha a tarefa pelo nome.
 */
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = require("express-rate-limit");
const node_crypto_1 = require("node:crypto");
const agenda_1 = require("./agenda");
const ficha_1 = require("./ficha");
class Recusa extends Error {
    constructor(status, fala) {
        super(fala);
        this.status = status;
        this.fala = fala;
    }
}
exports.Recusa = Recusa;
const JANELA_SEGUNDOS = 300;
const DITAS = 3;
const SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const sha256 = (dado) => (0, node_crypto_1.createHash)("sha256").update(dado).digest("hex");
exports.sha256 = sha256;
function caminhoDaAcao(url) {
    const [rota, query] = url.split("?");
    return (rota.replace(/^\/ive(?=\/|$)/, "") || "/") + (query ? `?${query}` : "");
}
function assinatura(chave, carimbo, metodo, caminho, corpo, pedido) {
    return (0, node_crypto_1.createHmac)("sha256", chave).update([carimbo, metodo, caminho, (0, exports.sha256)(corpo), pedido].join("\n")).digest("hex");
}
const iguais = (a, b) => a.length === b.length && (0, node_crypto_1.timingSafeEqual)(Buffer.from(a), Buffer.from(b));
function texto(valor, max) {
    if (typeof valor !== "string")
        return "";
    return valor.replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
/** Minúsculas e sem acento, mas mantendo "/" e ":" (datas e horas). */
const leve = (texto) => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
/** "hoje", "amanhã", "depois de amanhã", "sexta", "dia 12", "12/10", "2026-10-12" -> "YYYY-MM-DD". */
function dataFalada(falada, hoje) {
    const t = leve(falada).replace(/^(pra|para|na|no|em|de)\s+/, "").replace(/-?feira$/, "").trim();
    if (!t || t === "hoje")
        return hoje;
    if (t === "amanha")
        return (0, agenda_1.somarDias)(hoje, 1);
    if (t === "depois de amanha")
        return (0, agenda_1.somarDias)(hoje, 2);
    const dia = SEMANA.findIndex((d) => t === d || t === `${d} feira` || t.startsWith(`${d} `));
    if (dia >= 0) {
        const falta = (dia - (0, agenda_1.lerData)(hoje).getDay() + 7) % 7 || 7;
        return (0, agenda_1.somarDias)(hoje, falta);
    }
    let achado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(falada.trim());
    if (achado)
        return falada.trim();
    achado = /^(?:dia\s+)?(\d{1,2})(?:\s*(?:\/|de)\s*(\d{1,2}))?(?:\s*\/\s*(\d{2,4}))?$/.exec(t.replace(/ de /, "/"));
    if (achado) {
        const base = (0, agenda_1.lerData)(hoje);
        const d = Number(achado[1]);
        let m = achado[2] ? Number(achado[2]) - 1 : base.getMonth();
        let a = achado[3] ? Number(achado[3].length === 2 ? `20${achado[3]}` : achado[3]) : base.getFullYear();
        if (!achado[2] && d < base.getDate())
            m += 1; // "dia 5" já passou este mês: o do mês que vem
        if (!achado[3] && achado[2] && new Date(a, m, d) < base)
            a += 1;
        const data = new Date(a, m, d);
        if (d < 1 || d > 31 || data.getDate() !== d)
            return null;
        return (0, agenda_1.escreverData)(data);
    }
    return null;
}
/** "15:30", "15h", "15h30", "3 da tarde" -> "HH:MM"; vazio -> null. */
function horaFalada(falada) {
    const t = leve(String(falada || "")).replace(/^as\s+/, "");
    if (!t || t === "-")
        return null;
    const achado = /^(\d{1,2})(?:\s*(?:h|:)\s*(\d{2})?)?(?:\s*(?:da|de)\s+(manha|tarde|noite))?$/.exec(t.replace(/\s*horas?$/, "h"));
    if (!achado)
        throw new Recusa(422, "Não entendi o horário.");
    let h = Number(achado[1]);
    const m = Number(achado[2] || 0);
    if ((achado[3] === "tarde" || achado[3] === "noite") && h < 12)
        h += 12;
    if (h > 23 || m > 59)
        throw new Recusa(422, "Não entendi o horário.");
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function createIveApp(deps) {
    const { repo, verificarLogin } = deps;
    const agora = deps.agora || (() => new Date());
    const hoje = () => (0, agenda_1.escreverData)(agora());
    const app = (0, express_1.default)();
    app.disable("x-powered-by");
    app.use(express_1.default.json({ limit: "16kb", verify: (req, _res, buf) => { req.rawBody = buf; } }));
    app.use((req, _res, next) => { req.url = caminhoDaAcao(req.url); next(); });
    const rota = (fn) => (req, res, next) => { fn(req, res).catch(next); };
    const etapa = (fn) => (req, res, next) => { fn(req, res).then(() => next(), next); };
    // ---------------------------------------------------------------- quem pede
    async function daIve(req, res, assinado = true) {
        const token = String(req.get("authorization") || "").replace(/^Bearer /, "");
        if (token.length < 20)
            throw new Recusa(401, "Sem token de acesso.");
        const hash = (0, exports.sha256)(token);
        const registro = await repo.tokenPorHash(hash);
        if (!registro || registro.revogado)
            throw new Recusa(401, "Token inválido. Gere outro no app.");
        if (assinado) {
            const carimbo = String(req.get("x-ive-timestamp") || "");
            const pedido = String(req.get("x-ive-request") || "");
            if (!/^\d{9,11}$/.test(carimbo) || Math.abs(agora().getTime() / 1000 - Number(carimbo)) > JANELA_SEGUNDOS)
                throw new Recusa(401, "Pedido fora do horário.");
            if (!/^[a-f0-9]{32}$/.test(pedido))
                throw new Recusa(401, "Pedido sem identificação.");
            const corpo = req.rawBody || Buffer.alloc(0);
            if (!iguais(String(req.get("x-ive-signature") || ""), assinatura(hash, carimbo, req.method, req.url, corpo, pedido)))
                throw new Recusa(401, "Assinatura inválida.");
            if (!(await repo.registrarPedido(pedido, new Date(agora().getTime() + 2 * JANELA_SEGUNDOS * 1000))))
                throw new Recusa(401, "Pedido repetido.");
        }
        await repo.marcarUso(registro.id);
        res.locals.tokenId = registro.id;
        return registro.uid;
    }
    async function quem(uid) {
        const p = await repo.pessoa(uid);
        if (!p)
            throw new Recusa(401, "Essa conta não está disponível.");
        if (!p.familyId)
            throw new Recusa(409, "Você ainda não está numa família no app.");
        return p;
    }
    async function acharPendente(p, nome, incluirFeitas = false) {
        const tarefas = (await repo.tarefas(p)).filter((t) => (0, agenda_1.visivel)(t, p) && (incluirFeitas || !t.completed));
        const { tarefa, varias } = (0, agenda_1.acharPorNome)(tarefas, nome);
        if (varias) {
            const nomes = varias.slice(0, DITAS).map((t) => (0, agenda_1.falarTarefa)(t, hoje()));
            throw new Recusa(409, `Tem ${varias.length} parecidas: ${nomes.join(", ")}. Qual delas?`);
        }
        if (!tarefa)
            throw new Recusa(404, `Não achei a tarefa ${texto(nome, 60)}.`);
        return tarefa;
    }
    async function porId(p, id, apagadaTambem = false) {
        const t = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? await repo.tarefa(id) : null;
        if (!t || !(0, agenda_1.visivel)({ ...t, deleted: apagadaTambem ? false : t.deleted }, p))
            throw new Recusa(404, "Não achei essa tarefa.");
        return t;
    }
    /** Muda direto, pede aprovação (dependente) ou recusa. Devolve true quando mudou. */
    async function permitido(p, t, acao, dados, res, pedido) {
        const pode = (0, agenda_1.podeMudar)({ ...t, deleted: false }, p);
        if (pode === "nao")
            throw new Recusa(403, "Só quem criou a tarefa ou o administrador pode mudar isso.");
        if (pode === "aprovacao") {
            await repo.pedirAprovacao(p, t.id, acao, dados);
            res.status(202).json({ fala: `Pedi pro administrador aprovar: ${pedido}.` });
            return false;
        }
        return true;
    }
    const porToken = (0, express_rate_limit_1.rateLimit)({ windowMs: 60000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false,
        keyGenerator: (_req, res) => String(res.locals.tokenId || "anonimo") });
    // ---------------------------------------------------------------- a ficha
    app.get("/ive.json", rota(async (req, res) => {
        await daIve(req, res, false);
        res.json(ficha_1.FICHA);
    }));
    // ---------------------------------------------------------------- tokens (pelo app, com o login do Firebase)
    const tokens = express_1.default.Router();
    const origens = (process.env.IVE_APP_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
    tokens.use((0, cors_1.default)({ origin: (origem, cb) => cb(null, !origem || origens.includes(origem)),
        allowedHeaders: ["Content-Type", "Authorization"], methods: ["GET", "POST", "DELETE"] }));
    tokens.use(etapa(async (req, res) => {
        try {
            res.locals.uid = await verificarLogin(String(req.get("authorization") || "").replace(/^Bearer /, ""));
        }
        catch {
            throw new Recusa(401, "Sessão inválida. Entre novamente.");
        }
    }), (0, express_rate_limit_1.rateLimit)({ windowMs: 60000, limit: 20, keyGenerator: (_req, res) => String(res.locals.uid) }));
    tokens.post("/", rota(async (req, res) => {
        if ((await repo.tokens(res.locals.uid)).length >= 5)
            throw new Recusa(409, "Revogue um acesso antes de criar outro.");
        const token = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        const id = await repo.criarToken(res.locals.uid, texto(req.body?.nome, 40) || "Ive", (0, exports.sha256)(token));
        res.status(201).json({ id, token });
    }));
    tokens.get("/", rota(async (_req, res) => {
        res.json({ tokens: (await repo.tokens(res.locals.uid)).map(({ id, nome, criadoEm, usadoEm }) => ({ id, nome, criadoEm, usadoEm })) });
    }));
    tokens.delete("/:id", rota(async (req, res) => {
        if (!(await repo.revogar(res.locals.uid, String(req.params.id))))
            throw new Recusa(404, "Acesso não encontrado.");
        res.status(204).end();
    }));
    app.use("/tokens", tokens);
    // ---------------------------------------------------------------- as ações da Ive
    const ive = express_1.default.Router();
    ive.use(etapa(async (req, res) => { res.locals.uid = await daIve(req, res); }), porToken);
    const listar = (fixo) => rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const dia = hoje();
        const quando = (0, agenda_1.normalizar)(fixo || String(req.query.quando || "hoje"));
        const pendentes = (await repo.tarefas(p)).filter((t) => (0, agenda_1.visivel)(t, p) && !t.completed)
            .sort((a, b) => (a.dueDate + (a.dueTime || "99")).localeCompare(b.dueDate + (b.dueTime || "99")));
        const lista = (itens, comData) => {
            const ditas = itens.slice(0, DITAS).map((t) => (0, agenda_1.falarTarefa)(t, dia, comData));
            const mais = itens.length > DITAS ? ` e mais ${itens.length - DITAS}` : "";
            return ditas.length > 1 && !mais ? `${ditas.slice(0, -1).join(", ")} e ${ditas[ditas.length - 1]}` : ditas.join(", ") + mais;
        };
        let alvo;
        let rotulo;
        let atrasadas = [];
        if (quando === "semana") {
            alvo = pendentes.filter((t) => t.dueDate >= dia && t.dueDate <= (0, agenda_1.somarDias)(dia, 6));
            rotulo = "Nos próximos 7 dias";
        }
        else if (quando === "pendentes" || quando === "todas") {
            alvo = pendentes;
            rotulo = "Pendentes";
        }
        else {
            const data = dataFalada(quando, dia) || dia;
            alvo = pendentes.filter((t) => t.dueDate === data);
            if (data === dia)
                atrasadas = pendentes.filter((t) => t.dueDate < dia);
            rotulo = data === dia ? "Hoje" : (0, agenda_1.falarData)(data, dia).replace(/^./, (c) => c.toUpperCase());
        }
        const comData = rotulo === "Nos próximos 7 dias" || rotulo === "Pendentes";
        const partes = [alvo.length ? `${rotulo}, ${alvo.length === 1 ? "1 tarefa" : `${alvo.length} tarefas`}: ${lista(alvo, comData)}.`
                : `${rotulo}, nada na agenda da família.`];
        if (atrasadas.length)
            partes.push(`${atrasadas.length === 1 ? "Tem 1 atrasada" : `Tem ${atrasadas.length} atrasadas`}: ${lista(atrasadas, true)}.`);
        res.json({ fala: partes.join(" "), total: alvo.length, atrasadas: atrasadas.length,
            itens: alvo.slice(0, 20).map((t) => ({ titulo: t.title })) });
    });
    ive.get("/tarefas/pendentes", listar("pendentes"));
    ive.get("/tarefas", listar());
    ive.post("/tarefas", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const falado = texto(req.body?.titulo, 120);
        if (!falado)
            throw new Recusa(422, "Faltou o nome da tarefa.");
        const titulo = falado.charAt(0).toUpperCase() + falado.slice(1); // a fala chega em minúsculas: como se digita no app
        const dia = req.body?.quando ? dataFalada(String(req.body.quando), hoje()) : hoje();
        if (!dia)
            throw new Recusa(422, "Não entendi a data.");
        const hora = horaFalada(req.body?.hora);
        const categoria = (0, agenda_1.categoriaDe)(texto(req.body?.categoria, 40), await repo.categorias(p.familyId));
        const privada = req.body?.privada === true || req.body?.privada === "true";
        const id = await repo.criar(p, { title: titulo, dueDate: dia, dueTime: hora, category: categoria, isPrivate: privada });
        const quando = (0, agenda_1.falarTarefa)({ title: "", dueDate: dia, dueTime: hora }, hoje()).trim();
        res.status(201).json({ id, titulo, fala: `Criei a tarefa ${titulo} pra ${quando}${privada ? ", só pra você" : ""}.` });
    }));
    ive.post("/tarefas/concluir", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await acharPendente(p, texto(req.body?.tarefa, 120));
        if (!(await permitido(p, t, "complete", { completed: true }, res, `concluir ${t.title}`)))
            return;
        let proxima = "";
        let fala = `Feito: ${t.title} concluída.`;
        await repo.mudar(p, t.id, { completed: true });
        if (t.recurrence !== "none") {
            // Como o app (store/taskStore.ts, spawnNextRecurringOccurrence): fecha esta e abre a próxima
            const data = (0, agenda_1.proximaData)(t.dueDate, t.recurrence, t.weekDays);
            if (!t.recurrenceEndDate || data <= t.recurrenceEndDate) {
                proxima = await repo.criar(p, {
                    title: t.title, description: t.description, dueDate: data, dueTime: t.dueTime || null, category: t.category,
                    isPrivate: !!t.isPrivate, recurrence: t.recurrence, weekDays: t.weekDays, recurrenceEndDate: t.recurrenceEndDate,
                    subtasks: (t.subtasks || []).map((s) => ({ ...s, completed: false })),
                });
                fala += ` A próxima é ${(0, agenda_1.falarData)(data, hoje())}.`;
            }
        }
        res.json({ id: t.id, titulo: t.title, proxima: proxima || "-", fala });
    }));
    ive.post("/tarefas/:id/reabrir", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await porId(p, String(req.params.id));
        if (!(await permitido(p, t, "update", { completed: false }, res, `reabrir ${t.title}`)))
            return;
        await repo.mudar(p, t.id, { completed: false });
        const proxima = String(req.body?.proxima || "");
        if (/^[A-Za-z0-9_-]{1,64}$/.test(proxima)) { // o "desfaz" de uma recorrente: tira a próxima que a conclusão abriu
            const nova = await repo.tarefa(proxima);
            if (nova && (0, agenda_1.visivel)(nova, p) && !nova.completed && nova.title === t.title && (0, agenda_1.podeMudar)(nova, p) === "sim")
                await repo.mudar(p, nova.id, { deleted: true });
        }
        res.json({ id: t.id, fala: `Reabri ${t.title}.` });
    }));
    const remarcar = (achar) => rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await achar(p, req);
        const dia = dataFalada(String(req.body?.quando || ""), hoje());
        if (!dia)
            throw new Recusa(422, "Não entendi a nova data.");
        const hora = req.body?.hora !== undefined ? horaFalada(req.body.hora) : t.dueTime || null;
        if (!(await permitido(p, t, "update", { dueDate: dia, dueTime: hora }, res, `mudar ${t.title} de data`)))
            return;
        await repo.mudar(p, t.id, { dueDate: dia, dueTime: hora });
        const quando = (0, agenda_1.falarTarefa)({ title: "", dueDate: dia, dueTime: hora }, hoje()).trim();
        res.json({ id: t.id, data_anterior: t.dueDate, hora_anterior: t.dueTime || "-", fala: `Passei ${t.title} pra ${quando}.` });
    });
    ive.patch("/tarefas/remarcar", remarcar((p, req) => acharPendente(p, texto(req.body?.tarefa, 120))));
    ive.patch("/tarefas/:id/remarcar", remarcar((p, req) => porId(p, String(req.params.id))));
    ive.delete("/tarefas", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const id = texto(req.query.id, 64);
        const t = id ? await porId(p, id) : await acharPendente(p, texto(req.query.tarefa, 120), true);
        if (!(await permitido(p, t, "delete", {}, res, `apagar ${t.title}`)))
            return;
        await repo.mudar(p, t.id, { deleted: true }); // exclusão suave, como o app: dá para desfazer
        res.json({ id: t.id, fala: `Apaguei a tarefa ${t.title}.` });
    }));
    ive.post("/tarefas/:id/restaurar", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await porId(p, String(req.params.id), true);
        if (!(await permitido(p, t, "update", { deletedAt: null }, res, `trazer ${t.title} de volta`)))
            return;
        await repo.mudar(p, t.id, { deleted: false });
        res.json({ id: t.id, fala: `A tarefa ${t.title} voltou.` });
    }));
    app.use("/", ive);
    app.use((_req, res) => { res.status(404).json({ fala: "Não conheço essa ação." }); });
    app.use((erro, _req, res, _next) => {
        const status = erro instanceof Recusa ? erro.status : 500;
        if (status >= 500)
            console.error(JSON.stringify({ event: "ive_error", type: erro instanceof Error ? erro.name : "unknown" }));
        res.status(status).json({ fala: erro instanceof Recusa ? erro.fala : "Deu um problema aqui. Tenta de novo daqui a pouco." });
    });
    return app;
}
//# sourceMappingURL=app.js.map