"use strict";
/**
 * Regras da agenda usadas pela Ive: as MESMAS do app, portadas sem mudança.
 *
 * - próxima data de uma tarefa recorrente: src/domain/services/RecurrenceCalculator.ts (+ utils/dateParser.ts)
 * - quem vê: firestore.rules (tarefas da família; privadas só para quem criou) e utils/taskPermissions.ts
 * - quem muda: firestore.rules (quem criou, ou admin se não for privada); dependente pede aprovação (store/taskStore.ts)
 * Mudou a regra no app? Mude aqui também (tests/ive.test.cjs confere os casos principais).
 * Datas "YYYY-MM-DD" no horário local: a função roda com TZ=America/Sao_Paulo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lerData = lerData;
exports.escreverData = escreverData;
exports.somarDias = somarDias;
exports.proximaData = proximaData;
exports.visivel = visivel;
exports.podeMudar = podeMudar;
exports.normalizar = normalizar;
exports.acharPorNome = acharPorNome;
exports.falarData = falarData;
exports.falarHora = falarHora;
exports.falarTarefa = falarTarefa;
exports.categoriaDe = categoriaDe;
// ------------------------------------------------------------------ datas (dateParser.ts)
function lerData(texto) {
    const [ano, mes, dia] = texto.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}
function escreverData(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
function somarDias(texto, dias) {
    const data = lerData(texto);
    data.setDate(data.getDate() + dias);
    return escreverData(data);
}
// ------------------------------------------------------------------ recorrência (RecurrenceCalculator.ts)
function proximaData(atual, recorrencia, diasDaSemana) {
    if (recorrencia === "none")
        return atual;
    const data = lerData(atual);
    switch (recorrencia) {
        case "daily":
            data.setDate(data.getDate() + 1);
            break;
        case "weekly":
            data.setDate(data.getDate() + 7);
            break;
        case "custom_weekly":
            if (diasDaSemana && diasDaSemana.length) {
                const hoje = data.getDay();
                const dias = [...diasDaSemana].sort((a, b) => a - b);
                const proximo = dias.find((d) => d > hoje);
                data.setDate(data.getDate() + (proximo !== undefined ? proximo - hoje : 7 - hoje + dias[0]));
            }
            else {
                data.setDate(data.getDate() + 7);
            }
            break;
        case "monthly":
            data.setMonth(data.getMonth() + 1);
            break;
        case "yearly":
            data.setFullYear(data.getFullYear() + 1);
            break;
        default:
            return atual;
    }
    return escreverData(data);
}
// ------------------------------------------------------------------ permissões (firestore.rules)
function visivel(t, p) {
    return !t.deleted && !!p.familyId && t.familyId === p.familyId && (!t.isPrivate || t.createdBy === p.uid);
}
/** "sim": muda direto; "aprovacao": dependente, vira pedido para o admin; "nao": sem permissão. */
function podeMudar(t, p) {
    if (!visivel(t, p))
        return "nao";
    if (p.role === "dependent")
        return "aprovacao";
    if (t.createdBy === p.uid || (p.role === "admin" && !t.isPrivate))
        return "sim";
    return "nao";
}
// ------------------------------------------------------------------ achar pelo nome falado
function normalizar(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}
/** A tarefa que a pessoa disse ("comprar leite"): exata, depois começa com, depois contém. Várias: pergunta qual. */
function acharPorNome(tarefas, nome) {
    const alvo = normalizar(nome).replace(/^(a|o|as|os)\s+/, "");
    if (!alvo)
        return {};
    for (const teste of [(t) => t === alvo, (t) => t.startsWith(alvo), (t) => t.includes(alvo)]) {
        const achadas = tarefas.filter((t) => teste(normalizar(t.title)));
        if (achadas.length === 1)
            return { tarefa: achadas[0] };
        if (achadas.length > 1) {
            const pendentes = achadas.filter((t) => !t.completed);
            if (pendentes.length === 1)
                return { tarefa: pendentes[0] };
            return { varias: achadas };
        }
    }
    return {};
}
// ------------------------------------------------------------------ como falar
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function falarData(data, hoje) {
    if (data === hoje)
        return "hoje";
    if (data === somarDias(hoje, 1))
        return "amanhã";
    if (data === somarDias(hoje, -1))
        return "ontem";
    const dias = Math.round((lerData(data).getTime() - lerData(hoje).getTime()) / 86400000);
    if (dias > 1 && dias < 7)
        return SEMANA[lerData(data).getDay()];
    const [, mes, dia] = data.split("-");
    return `dia ${Number(dia)}/${Number(mes)}`;
}
function falarHora(hora) {
    if (!hora || !/^\d{1,2}:\d{2}$/.test(hora))
        return "";
    const [h, m] = hora.split(":").map(Number);
    return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
}
function falarTarefa(t, hoje, comData = true) {
    const hora = falarHora(t.dueTime);
    const quando = comData ? falarData(t.dueDate, hoje) : "";
    return [t.title, quando, hora ? `às ${hora}` : ""].filter(Boolean).join(" ");
}
// ------------------------------------------------------------------ categorias
const CATEGORIAS = {
    casa: "home", lar: "home", trabalho: "work", servico: "work", escola: "school", estudo: "school",
    financas: "finance", financeiro: "finance", dinheiro: "finance", saude: "health", medico: "health",
    compras: "shopping", mercado: "shopping", lazer: "leisure", diversao: "leisure", exercicio: "exercise",
    academia: "exercise", familia: "family", projetos: "projects", projeto: "projects", reuniao: "meetings",
    reunioes: "meetings", viagem: "travel", viagens: "travel", outros: "other", outro: "other",
};
/** A categoria falada -> id do app (as padrão pelo nome em português; as da família pelo rótulo). */
function categoriaDe(falada, daFamilia) {
    const alvo = normalizar(falada);
    if (!alvo)
        return "other";
    return CATEGORIAS[alvo] || daFamilia.find((c) => normalizar(c.label) === alvo)?.id || "other";
}
//# sourceMappingURL=agenda.js.map