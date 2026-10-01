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
const campos_1 = require("./campos");
const ficha_1 = require("./ficha");
class Recusa extends Error {
    constructor(status, fala, falta) {
        super(fala);
        this.status = status;
        this.fala = fala;
        this.falta = falta;
    }
}
exports.Recusa = Recusa;
/** Faltou um dado (ou não deu para entender): a Ive pergunta e manda de novo com a resposta nesse campo. */
const pergunta = (falta, fala) => new Recusa(422, fala, falta);
const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
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
    /** A tarefa pelo nome falado. Várias parecidas: pergunta qual ("qual": a data, a hora, a ordem ou o nome). */
    async function acharPendente(p, nome, incluirFeitas = false, qual = "") {
        if (!nome)
            throw pergunta("tarefa", "Qual tarefa?");
        const tarefas = (await repo.tarefas(p)).filter((t) => (0, agenda_1.visivel)(t, p) && (incluirFeitas || !t.completed))
            .sort((a, b) => (a.dueDate + (a.dueTime || "99")).localeCompare(b.dueDate + (b.dueTime || "99")));
        const { tarefa, varias } = (0, agenda_1.acharPorNome)(tarefas, nome);
        if (varias) {
            const escolhida = qual ? (0, campos_1.escolher)(varias, qual, (d) => dataFalada(d, hoje()), (h) => horaFalada(h)) : null;
            if (escolhida)
                return escolhida;
            throw pergunta("qual", (qual ? "Não consegui saber qual. " : "") + (0, campos_1.perguntaQual)(varias, hoje()));
        }
        if (!tarefa)
            throw pergunta("tarefa", `Não achei a tarefa ${texto(nome, 60)}. Qual o nome dela?`);
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
    // A resposta de um dia (ou da semana, ou das pendentes) sobre as tarefas já lidas: a rota lê uma vez por pedido e o
    // /painel lê uma vez para todos os dias (a Ive guarda e responde na hora; ive-app/1 "painel").
    const pendentesDe = async (p) => (await repo.tarefas(p))
        .filter((t) => (0, agenda_1.visivel)(t, p) && !t.completed)
        .sort((a, b) => (a.dueDate + (a.dueTime || "99")).localeCompare(b.dueDate + (b.dueTime || "99")));
    const tarefasDe = (pendentes, dia, quando) => {
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
        const partes = [alvo.length ? `${rotulo}, ${alvo.length === 1 ? "1 tarefa da família" : `${alvo.length} tarefas da família`}: ${lista(alvo, comData)}.`
                : `${rotulo}, nada na agenda da família.`];
        if (atrasadas.length) {
            // atrasadas: o total e as duas mais antigas, sem hora (a fala não vira uma lista comprida)
            const nomes = atrasadas.slice(0, 2).map((t) => t.title);
            const mais = atrasadas.length > 2 ? ` e mais ${atrasadas.length - 2}` : "";
            const ditas = nomes.length === 2 && !mais ? `${nomes[0]} e ${nomes[1]}` : nomes.join(", ") + mais;
            partes.push(`${atrasadas.length === 1 ? "Tem 1 atrasada" : `Tem ${atrasadas.length} atrasadas`}: ${ditas}.`);
        }
        return { fala: partes.join(" "), total: alvo.length, atrasadas: atrasadas.length,
            vazio: !alvo.length && !atrasadas.length, // a Ive não repete "nada" ao juntar com a agenda dela
            itens: alvo.slice(0, 20).map((t) => ({ titulo: t.title })) };
    };
    const listar = (fixo) => rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        res.json(tarefasDe(await pendentesDe(p), hoje(), (0, agenda_1.normalizar)(fixo || String(req.query.quando || "hoje"))));
    });
    const DIAS_DO_PAINEL = ["hoje", "amanha", "semana", "pendentes", "domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    ive.get("/painel", rota(async (_req, res) => {
        const p = await quem(res.locals.uid);
        const pendentes = await pendentesDe(p);
        const dia = hoje();
        const respostas = DIAS_DO_PAINEL.map((quando) => ({ acao: "tarefas", args: { quando }, dados: tarefasDe(pendentes, dia, quando) }));
        respostas.push({ acao: "tarefas", args: {}, dados: tarefasDe(pendentes, dia, "hoje") }, // sem dia: hoje
        { acao: "tarefas_pendentes", args: {}, dados: tarefasDe(pendentes, dia, "pendentes") });
        if (p.role === "admin") {
            const itens = await pedidos(p);
            respostas.push({ acao: "aprovacoes", args: {},
                dados: { fala: falarPedidos(itens), total: itens.length, vazio: !itens.length, itens: itens.map((i) => ({ titulo: i.texto })) } });
        }
        res.json({ respostas });
    }));
    ive.get("/tarefas/pendentes", listar("pendentes"));
    ive.get("/tarefas", listar());
    // ---------------------------------------------------------------- criar e editar: os campos de uma tarefa
    const horaAgora = () => { const a = agora(); return `${String(a.getHours()).padStart(2, "0")}:${String(a.getMinutes()).padStart(2, "0")}`; };
    const PERGUNTA_DATA = "Pra quando é? Pode ser hoje, amanhã, sexta ou dia 12.";
    const PERGUNTA_REPETICAO = "Não entendi a repetição. Pode ser todo dia, toda semana, toda segunda e quarta, todo mês, todo ano, ou não repete.";
    const codigoRepeticao = (t) => t.recurrence === "custom_weekly" ? `custom_weekly:${(t.weekDays || []).join(",")}` : t.recurrence || "none";
    function lerHora(falada) {
        try {
            return horaFalada(falada);
        }
        catch {
            throw pergunta("hora", "Não entendi o horário. Que horas? Pode ser 15h ou 3 da tarde.");
        }
    }
    /** "pra sexta às 15h, em Saúde, toda segunda, com 2 subtarefas, só pra você": o que mudou ou foi criado. */
    function descrever(c, daFamilia) {
        const partes = [];
        if (c.title)
            partes.push(`com o nome ${c.title}`);
        if (c.dueDate)
            partes.push(`pra ${(0, agenda_1.falarTarefa)({ title: "", dueDate: c.dueDate, dueTime: c.dueTime }, hoje()).trim()}`);
        else if (c.dueTime)
            partes.push(`às ${(0, agenda_1.falarTarefa)({ title: "", dueDate: "", dueTime: c.dueTime }, hoje()).replace(/^.*às /, "").trim()}`);
        if (c.category)
            partes.push(`em ${(0, campos_1.nomeDaCategoria)(c.category, daFamilia)}`);
        if (c.recurrence)
            partes.push((0, campos_1.falarRepeticao)(c.recurrence) || "sem repetir");
        if (c.subtasks)
            partes.push(c.subtasks.length ? `com ${c.subtasks.length === 1 ? "1 subtarefa" : `${c.subtasks.length} subtarefas`}` : "sem subtarefas");
        if (c.isPrivate !== undefined)
            partes.push(c.isPrivate ? "só pra você" : "pra família toda");
        return partes.join(", ");
    }
    // Criar: título, data, categoria são obrigatórios (a Ive pergunta); sem hora, a hora de agora; pública se a pessoa
    // não disser; repetição e subtarefas, se falar.
    ive.post("/tarefas", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const corpo = req.body || {};
        const falado = texto(corpo.titulo, 120);
        if (!falado)
            throw pergunta("titulo", "Qual o nome da tarefa?");
        const titulo = maiuscula(falado); // a fala chega em minúsculas: como se digita no app
        if (!texto(corpo.quando, 40))
            throw pergunta("quando", PERGUNTA_DATA);
        const dia = dataFalada(texto(corpo.quando, 40), hoje());
        if (!dia)
            throw pergunta("quando", `Não entendi a data. ${PERGUNTA_DATA}`);
        const hora = texto(String(corpo.hora ?? ""), 20) ? lerHora(corpo.hora) : horaAgora();
        const daFamilia = await repo.categorias(p.familyId);
        if (!texto(corpo.categoria, 40))
            throw pergunta("categoria", (0, campos_1.perguntaCategoria)(titulo, daFamilia));
        const categoria = (0, campos_1.lerCategoria)(texto(corpo.categoria, 40), titulo, daFamilia);
        if (!categoria)
            throw pergunta("categoria", (0, campos_1.perguntaCategoria)(titulo, daFamilia, "Não achei essa categoria. "));
        const privada = corpo.privada === undefined || corpo.privada === "" ? false : (0, campos_1.lerPrivada)(corpo.privada);
        if (privada === null)
            throw pergunta("privada", "Ela é só pra você ou pra família toda?");
        const repeticao = texto(corpo.recorrencia, 60) ? (0, campos_1.lerRepeticao)(texto(corpo.recorrencia, 60)) : { recurrence: "none" };
        if (!repeticao)
            throw pergunta("recorrencia", PERGUNTA_REPETICAO);
        const subtarefas = texto(corpo.subtarefas, 600) ? (0, campos_1.lerSubtarefas)(texto(corpo.subtarefas, 600), categoria.id) || [] : [];
        const id = await repo.criar(p, { title: titulo, dueDate: dia, dueTime: hora, category: categoria.id, isPrivate: privada,
            recurrence: repeticao.recurrence, weekDays: repeticao.weekDays, subtasks: subtarefas });
        const resumo = descrever({ dueDate: dia, dueTime: hora, category: categoria.id,
            recurrence: repeticao.recurrence === "none" ? undefined : repeticao,
            subtasks: subtarefas.length ? subtarefas : undefined, isPrivate: privada || undefined }, daFamilia);
        res.status(201).json({ id, titulo, fala: `Criei a tarefa ${titulo} ${resumo}.` });
    }));
    const CAMPOS = ["novo_titulo", "quando", "hora", "categoria", "privada", "recorrencia", "subtarefas"];
    /** A resposta a "O que muda?": "pra sexta às 15h", "categoria saúde", "privada", "toda segunda", "nome pra X". */
    function lerOQue(falado) {
        const t = (0, agenda_1.normalizar)(falado);
        const achado = {};
        const nome = /\b(?:o\s+)?(?:nome|t[ií]tulo)\s+(?:pra|para|de)\s+(.+)$/i.exec(falado) || /\b(?:chamar|chama)\s+(.+)$/i.exec(falado);
        if (nome)
            return { novo_titulo: nome[1].trim() };
        const subs = /\bsubtarefas?\b\s*(.*)$/i.exec(falado);
        if (subs)
            return { subtarefas: subs[1].trim() || "nenhuma" };
        const categoria = /\bcategoria\s+(?:pra\s+|para\s+)?(.+)$/.exec(t);
        if (categoria)
            achado.categoria = categoria[1];
        if (/\b(privada|privado|publica|publico|so pra mim|pra familia)\b/.test(t))
            achado.privada = t;
        if (/\b(todo|toda|todos|todas|repet|diari|semanal|mensal|anual|dias uteis|fim de semana)/.test(t))
            achado.recorrencia = t;
        const hora = /\bas\s+(\d{1,2}(?:\s*(?:h|:)\s*\d{0,2})?(?:\s*horas?)?(?:\s+da\s+(?:manha|tarde|noite))?)/.exec(t);
        if (hora)
            achado.hora = hora[1];
        const dia = t.replace(/\bas\s+\d.*$/, "").replace(/^(?:muda|mude|passa|passe|coloca|poe)\s+/, "").replace(/^(?:pra|para)\s+/, "").trim();
        if (!achado.recorrencia && !achado.categoria && !achado.privada && dia && dataFalada(dia, hoje())
            && /\d|hoje|amanha|domingo|segunda|terca|quarta|quinta|sexta|sabado/.test(dia))
            achado.quando = dia;
        return achado;
    }
    // Editar: os mesmos campos de criar, na tarefa achada pelo nome (várias parecidas: pergunta qual).
    ive.patch("/tarefas/editar", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await acharPendente(p, texto(req.body?.tarefa, 120), false, texto(req.body?.qual, 60));
        let corpo = req.body || {};
        const tem = () => CAMPOS.some((c) => texto(String(corpo[c] ?? ""), 600));
        if (!tem() && texto(corpo.o_que, 200))
            corpo = { ...corpo, ...lerOQue(texto(corpo.o_que, 200)) };
        if (!tem()) {
            throw pergunta("o_que", `${texto(corpo.o_que, 200) ? "Não entendi. " : ""}O que muda na tarefa ${t.title}? `
                + "O nome, o dia, a hora, a categoria, se é privada, a repetição ou as subtarefas.");
        }
        const daFamilia = await repo.categorias(p.familyId);
        const mudanca = {};
        const valor = (c, max) => texto(String(corpo[c] ?? ""), max);
        if (valor("novo_titulo", 120))
            mudanca.title = maiuscula(valor("novo_titulo", 120));
        if (valor("quando", 40)) {
            const dia = dataFalada(valor("quando", 40), hoje());
            if (!dia)
                throw pergunta("quando", `Não entendi a data. ${PERGUNTA_DATA}`);
            mudanca.dueDate = dia;
        }
        if (valor("hora", 20))
            mudanca.dueTime = lerHora(valor("hora", 20));
        if (valor("categoria", 40)) {
            const categoria = (0, campos_1.lerCategoria)(valor("categoria", 40), mudanca.title || t.title, daFamilia);
            if (!categoria)
                throw pergunta("categoria", (0, campos_1.perguntaCategoria)(mudanca.title || t.title, daFamilia, "Não achei essa categoria. "));
            mudanca.category = categoria.id;
        }
        if (corpo.privada !== undefined && corpo.privada !== "") {
            const privada = (0, campos_1.lerPrivada)(corpo.privada);
            if (privada === null)
                throw pergunta("privada", "Ela fica só pra você ou pra família toda?");
            mudanca.isPrivate = privada;
            if (privada && !t.isPrivate)
                mudanca.createdBy = p.uid; // como o app: ficar privada passa a tarefa para quem mudou
        }
        let repeticao;
        if (valor("recorrencia", 60)) {
            repeticao = (0, campos_1.lerRepeticao)(valor("recorrencia", 60)) || undefined;
            if (!repeticao)
                throw pergunta("recorrencia", PERGUNTA_REPETICAO);
            mudanca.recurrence = repeticao.recurrence;
            mudanca.weekDays = repeticao.weekDays || [];
        }
        if (valor("subtarefas", 600))
            mudanca.subtasks = (0, campos_1.lerSubtarefas)(valor("subtarefas", 600), mudanca.category || t.category) || [];
        if (!(await permitido(p, t, "update", mudanca, res, `mudar ${t.title}`)))
            return;
        await repo.mudar(p, t.id, mudanca);
        const resumo = descrever({ title: mudanca.title, dueDate: mudanca.dueDate, dueTime: mudanca.dueTime, category: mudanca.category,
            recurrence: repeticao, subtasks: mudanca.subtasks, isPrivate: mudanca.isPrivate }, daFamilia);
        res.json({ id: t.id, titulo: mudanca.title || t.title, fala: `Mudei a tarefa ${t.title}: ${resumo}.`,
            // o "desfaz" da Ive: os valores de antes (voltar_tarefa)
            titulo_anterior: t.title, data_anterior: t.dueDate, hora_anterior: t.dueTime || "-", categoria_anterior: t.category,
            privada_anterior: t.isPrivate ? "sim" : "nao", recorrencia_anterior: codigoRepeticao(t), dono_anterior: t.createdBy });
    }));
    // O "desfaz" da edição: os valores guardados, como estavam (as subtarefas ficam como a edição deixou).
    ive.patch("/tarefas/:id/voltar", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await porId(p, String(req.params.id));
        const c = req.body || {};
        const [recurrence, dias] = String(c.recorrencia || "none").split(":");
        const mudanca = {
            title: texto(c.titulo, 120) || t.title,
            dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(c.quando)) ? String(c.quando) : t.dueDate,
            dueTime: c.hora === "-" ? null : /^\d{2}:\d{2}$/.test(String(c.hora)) ? String(c.hora) : t.dueTime || null,
            category: texto(c.categoria, 60) || t.category, isPrivate: c.privada === "sim",
            recurrence: (["none", "daily", "weekly", "custom_weekly", "monthly", "yearly"].includes(recurrence) ? recurrence : t.recurrence),
            weekDays: dias ? dias.split(",").map(Number).filter((d) => d >= 0 && d <= 6) : [],
        };
        if (/^[A-Za-z0-9_-]{1,128}$/.test(String(c.dono || "")))
            mudanca.createdBy = String(c.dono);
        if (!(await permitido(p, t, "update", mudanca, res, `voltar ${t.title} como estava`)))
            return;
        await repo.mudar(p, t.id, mudanca);
        res.json({ id: t.id, fala: `Voltei a tarefa ${mudanca.title} como estava.` });
    }));
    // Pular (só recorrente): vai para a próxima data, como o botão "pular" do app (store/taskStore.ts skipTask).
    ive.post("/tarefas/pular", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await acharPendente(p, texto(req.body?.tarefa, 120), false, texto(req.body?.qual, 60));
        if (t.recurrence === "none")
            throw new Recusa(409, `A tarefa ${t.title} não se repete, então não dá pra pular. Posso mudar a data ou apagar.`);
        const data = (0, agenda_1.proximaData)(t.dueDate, t.recurrence, t.weekDays);
        const mudanca = { dueDate: data, completed: false, subtasks: t.subtasks };
        if (!(await permitido(p, t, "update", mudanca, res, `pular ${t.title}`)))
            return;
        await repo.mudar(p, t.id, mudanca);
        res.json({ id: t.id, data_anterior: t.dueDate, hora_anterior: t.dueTime || "-",
            fala: `Pulei ${t.title}. A próxima é ${(0, agenda_1.falarTarefa)({ ...t, title: "", dueDate: data }, hoje()).trim()}.` });
    }));
    ive.post("/tarefas/concluir", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const t = await acharPendente(p, texto(req.body?.tarefa, 120), false, texto(req.body?.qual, 60));
        if (!(await permitido(p, t, "complete", { completed: true }, res, `concluir ${t.title}`)))
            return;
        const { proxima, fala } = await concluir(p, t);
        res.json({ id: t.id, titulo: t.title, proxima: proxima || "-", fala: `Feito: ${t.title} concluída.${fala}` });
    }));
    /** Conclui; recorrente abre a próxima, como o app (store/taskStore.ts, spawnNextRecurringOccurrence). */
    async function concluir(p, t) {
        await repo.mudar(p, t.id, { completed: true });
        if (t.recurrence === "none")
            return { proxima: "", fala: "" };
        const data = (0, agenda_1.proximaData)(t.dueDate, t.recurrence, t.weekDays);
        if (t.recurrenceEndDate && data > t.recurrenceEndDate)
            return { proxima: "", fala: "" };
        const proxima = await repo.criar(p, {
            title: t.title, description: t.description, dueDate: data, dueTime: t.dueTime || null, category: t.category,
            isPrivate: !!t.isPrivate, recurrence: t.recurrence, weekDays: t.weekDays, recurrenceEndDate: t.recurrenceEndDate,
            subtasks: (t.subtasks || []).map((s) => ({ ...s, completed: false })),
        });
        return { proxima, fala: ` A próxima é ${(0, agenda_1.falarData)(data, hoje())}.` };
    }
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
        if (!texto(String(req.body?.quando ?? ""), 40))
            throw pergunta("quando", `Pra quando passo ${t.title}?`);
        const dia = dataFalada(String(req.body.quando), hoje());
        if (!dia)
            throw pergunta("quando", `Não entendi a nova data. ${PERGUNTA_DATA}`);
        const hora = req.body?.hora !== undefined && req.body.hora !== "" ? lerHora(req.body.hora) : t.dueTime || null;
        if (!(await permitido(p, t, "update", { dueDate: dia, dueTime: hora }, res, `mudar ${t.title} de data`)))
            return;
        await repo.mudar(p, t.id, { dueDate: dia, dueTime: hora });
        const quando = (0, agenda_1.falarTarefa)({ title: "", dueDate: dia, dueTime: hora }, hoje()).trim();
        res.json({ id: t.id, data_anterior: t.dueDate, hora_anterior: t.dueTime || "-", fala: `Passei ${t.title} pra ${quando}.` });
    });
    ive.patch("/tarefas/remarcar", remarcar((p, req) => acharPendente(p, texto(req.body?.tarefa, 120), false, texto(req.body?.qual, 60))));
    ive.patch("/tarefas/:id/remarcar", remarcar((p, req) => porId(p, String(req.params.id))));
    ive.delete("/tarefas", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const id = texto(req.query.id, 64);
        const t = id ? await porId(p, id) : await acharPendente(p, texto(req.query.tarefa, 120), true, texto(req.query.qual, 60));
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
    // ---------------------------------------------------------------- aprovações (só o administrador, como no app)
    const soAdmin = (p, o_que) => {
        if (p.role !== "admin")
            throw new Recusa(403, `Só o administrador da família pode ${o_que}.`);
    };
    const lista = (itens) => (itens.length > 1 ? `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}` : itens.join(""));
    function oQuePede(a, tarefa) {
        const nome = tarefa?.title || "uma tarefa que não existe mais";
        if (a.action === "delete")
            return `apagar ${nome}`;
        if (a.action === "complete" || a.data?.completed === true)
            return `concluir ${nome}`;
        if (typeof a.data?.dueDate === "string" && Object.keys(a.data).every((k) => ["dueDate", "dueTime", "completed", "subtasks"].includes(k)))
            return `passar ${nome} pra ${(0, agenda_1.falarData)(a.data.dueDate, hoje())}`;
        return `mudar ${nome}`;
    }
    async function pedidos(p) {
        const pendentes = await repo.aprovacoes(p.familyId);
        return Promise.all(pendentes.map(async (a) => {
            const tarefa = /^[A-Za-z0-9_-]{1,64}$/.test(a.taskId) ? await repo.tarefa(a.taskId) : null;
            return { a, tarefa, texto: `${a.userName || "Alguém"} quer ${oQuePede(a, tarefa)}` };
        }));
    }
    const falarPedidos = (itens) => (itens.length
        ? `${itens.length === 1 ? "Tem 1 pedido de aprovação" : `Tem ${itens.length} pedidos de aprovação`}: ${lista(itens.slice(0, DITAS).map((i) => i.texto))}`
            + `${itens.length > DITAS ? ` e mais ${itens.length - DITAS}` : ""}.`
        : "Nenhum pedido de aprovação.");
    ive.get("/aprovacoes", rota(async (_req, res) => {
        const p = await quem(res.locals.uid);
        soAdmin(p, "ver as aprovações");
        const itens = await pedidos(p);
        res.json({ fala: falarPedidos(itens), total: itens.length, vazio: !itens.length, itens: itens.map((i) => ({ titulo: i.texto })) });
    }));
    const CAMPOS_APROVADOS = ["title", "dueDate", "dueTime", "category", "completed", "subtasks", "isPrivate", "recurrence",
        "weekDays", "recurrenceEndDate", "createdBy", "description"];
    /** Aprovar faz o que foi pedido (como a tela Aprovações do app); recusar só fecha o pedido. */
    ive.post("/aprovacoes/responder", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        soAdmin(p, "responder aprovações");
        const todos = await pedidos(p);
        if (!todos.length)
            throw new Recusa(404, "Não tem nenhum pedido de aprovação.");
        const qual = (0, agenda_1.normalizar)(texto(req.body?.pedido, 120));
        let escolhidos = todos;
        if (/^(todos|todas|tudo)$/.test(qual))
            escolhidos = todos;
        else if (qual) {
            const palavras = qual.split(" ").filter((w) => w.length >= 3 && !["pedido", "quer", "aprova", "recusa", "dela", "dele"].includes(w));
            escolhidos = todos.filter((i) => palavras.every((w) => (0, agenda_1.normalizar)(i.texto).includes(w)));
            if (!escolhidos.length)
                throw pergunta("pedido", `Não achei esse pedido. ${falarPedidos(todos)} Qual deles?`);
        }
        if (escolhidos.length > 1 && !/^(todos|todas|tudo)$/.test(qual))
            throw pergunta("pedido", `${falarPedidos(escolhidos)} Qual deles? Ou todos?`);
        const decisao = (0, agenda_1.normalizar)(texto(String(req.body?.decisao ?? ""), 40));
        const aprova = /^(aprov|sim|pode|aceit|libera|autoriz|ok)/.test(decisao) ? true
            : /^(recus|rejeit|nega|nao|bloque)/.test(decisao) ? false : null;
        if (aprova === null)
            throw pergunta("decisao", `${escolhidos.length === 1 ? escolhidos[0].texto : falarPedidos(escolhidos)}. Aprovo ou recuso?`);
        for (const { a, tarefa } of escolhidos) {
            if (aprova && tarefa && !tarefa.deleted) {
                if (a.action === "delete")
                    await repo.mudar(p, tarefa.id, { deleted: true });
                else if (a.action === "complete" || (a.data?.completed === true && !tarefa.completed))
                    await concluir(p, tarefa);
                else {
                    const dados = Object.fromEntries(Object.entries(a.data || {}).filter(([k]) => CAMPOS_APROVADOS.includes(k)));
                    if ("deletedAt" in (a.data || {}))
                        Object.assign(dados, { deleted: a.data.deletedAt !== null });
                    await repo.mudar(p, tarefa.id, dados);
                }
            }
            await repo.responderAprovacao(a.id, aprova ? "approved" : "rejected");
        }
        const ditos = lista(escolhidos.slice(0, DITAS).map((i) => i.texto.replace(/ quer /, aprova ? " pode " : " não vai ")));
        res.json({ total: escolhidos.length, fala: `${aprova ? "Aprovado" : "Recusado"}: ${ditos}${escolhidos.length > DITAS ? ` e mais ${escolhidos.length - DITAS}` : ""}.` });
    }));
    // ---------------------------------------------------------------- membros da família
    const PAPEIS = { admin: "admin", parent: "responsável", dependent: "dependente" };
    function acharMembro(membros, nome) {
        if (!nome)
            throw pergunta("membro", "Qual pessoa da família?");
        const alvo = (0, agenda_1.normalizar)(nome).replace(/^(?:a|o)\s+/, "");
        for (const teste of [(n) => n === alvo, (n) => n.startsWith(alvo), (n) => n.includes(alvo)]) {
            const achados = membros.filter((m) => teste((0, agenda_1.normalizar)(m.nome)));
            if (achados.length === 1)
                return achados[0];
            if (achados.length > 1)
                throw pergunta("membro", `Tem ${achados.length} com esse nome: ${lista(achados.map((m) => m.nome))}. Qual?`);
        }
        throw pergunta("membro", `Não achei ${texto(nome, 40)} na família. Tem ${lista(membros.map((m) => m.nome))}. Quem?`);
    }
    ive.get("/membros", rota(async (_req, res) => {
        const p = await quem(res.locals.uid);
        const membros = await repo.membros(p.familyId);
        res.json({ total: membros.length, itens: membros.map((m) => ({ titulo: m.nome })),
            fala: `Na família: ${lista(membros.map((m) => `${m.nome}${m.role ? ` (${PAPEIS[m.role]})` : ""}`))}.` });
    }));
    const renomear = (achar) => rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        const m = achar(p, await repo.membros(p.familyId), req);
        if (m.uid !== p.uid)
            soAdmin(p, "mudar o nome de outra pessoa");
        const novo = texto(req.body?.nome, 60).split(" ").map(maiuscula).join(" ");
        if (!novo)
            throw pergunta("nome", `Qual o novo nome de ${m.nome}?`);
        await repo.mudarMembro(m.uid, { displayName: novo });
        res.json({ id: m.uid, nome_anterior: m.nome, fala: `Pronto: ${m.nome} agora é ${novo}.` });
    });
    ive.patch("/membros/nome", renomear((_p, membros, req) => acharMembro(membros, texto(req.body?.membro, 60))));
    ive.patch("/membros/:id/nome", renomear((_p, membros, req) => {
        const m = membros.find((x) => x.uid === String(req.params.id));
        if (!m)
            throw new Recusa(404, "Essa pessoa não está mais na família.");
        return m;
    }));
    ive.delete("/membros", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        soAdmin(p, "tirar alguém da família");
        const m = acharMembro(await repo.membros(p.familyId), texto(req.query.membro, 60));
        if (m.uid === p.uid)
            throw new Recusa(409, "Pra sair da família, use o app.");
        await repo.mudarMembro(m.uid, { familyId: null, role: null }); // como o app (familyService.removeMemberFromFamily)
        res.json({ id: m.uid, papel_anterior: m.role || "dependent", fala: `Tirei ${m.nome} da família.` });
    }));
    // O "desfaz" de tirar da família: volta com o mesmo papel, se a pessoa não entrou em outra família.
    ive.post("/membros/:id/restaurar", rota(async (req, res) => {
        const p = await quem(res.locals.uid);
        soAdmin(p, "trazer alguém de volta pra família");
        const uid = String(req.params.id);
        const pessoa = /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? await repo.pessoa(uid) : null;
        if (!pessoa)
            throw new Recusa(404, "Não achei essa pessoa.");
        if (pessoa.familyId && pessoa.familyId !== p.familyId)
            throw new Recusa(409, `${pessoa.nome} já está em outra família.`);
        const papel = ["admin", "parent", "dependent"].includes(String(req.body?.papel)) ? req.body.papel : "dependent";
        await repo.mudarMembro(uid, { familyId: p.familyId, role: papel });
        res.json({ id: uid, fala: `${pessoa.nome} voltou pra família.` });
    }));
    app.use("/", ive);
    app.use((_req, res) => { res.status(404).json({ fala: "Não conheço essa ação." }); });
    app.use((erro, _req, res, _next) => {
        const status = erro instanceof Recusa ? erro.status : 500;
        if (status >= 500)
            console.error(JSON.stringify({ event: "ive_error", type: erro instanceof Error ? erro.name : "unknown" }));
        res.status(status).json({ fala: erro instanceof Recusa ? erro.fala : "Deu um problema aqui. Tenta de novo daqui a pouco.",
            ...(erro instanceof Recusa && erro.falta ? { falta: erro.falta } : {}) });
    });
    return app;
}
//# sourceMappingURL=app.js.map