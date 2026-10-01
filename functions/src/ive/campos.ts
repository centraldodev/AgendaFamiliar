/**
 * O que a pessoa falou -> os campos da tarefa, como o app grava. Cada leitura devolve o valor, ou null quando não deu
 * para entender (a rota pergunta de novo: 422 { falta, fala }, protocolo ive-app/1).
 *
 * - categoria: as padrão do app (utils/taskUtils.ts DEFAULT_CATEGORIES, pelo nome em português) e as da família;
 * - repetição: "none" | "daily" | "weekly" | "custom_weekly" (com weekDays) | "monthly" | "yearly", como o app;
 * - subtarefas: "comprar pão, leite e ovos" -> três subtarefas (id, título, não feita, a categoria da tarefa);
 * - várias parecidas: "a de sexta", "a das 15h", "a primeira", ou um pedaço do nome escolhe uma.
 */
import { randomBytes } from "node:crypto";
import { falarTarefa, normalizar, Recorrencia, Tarefa } from "./agenda";

export interface Categoria { id: string; label: string }

/** As categorias padrão do app, com o nome que a pessoa fala (os rótulos do app vêm da tradução). */
export const PADRAO: Categoria[] = [
  { id: "home", label: "Casa" }, { id: "work", label: "Trabalho" }, { id: "school", label: "Escola" },
  { id: "finance", label: "Finanças" }, { id: "health", label: "Saúde" }, { id: "shopping", label: "Compras" },
  { id: "leisure", label: "Lazer" }, { id: "exercise", label: "Exercício" }, { id: "family", label: "Família" },
  { id: "projects", label: "Projetos" }, { id: "meetings", label: "Reuniões" }, { id: "travel", label: "Viagem" },
  { id: "other", label: "Outros" },
];

const SINONIMOS: Record<string, string> = {
  casa: "home", lar: "home", trabalho: "work", servico: "work", escola: "school", estudo: "school", estudos: "school",
  financas: "finance", financeiro: "finance", dinheiro: "finance", saude: "health", medico: "health",
  compras: "shopping", compra: "shopping", mercado: "shopping", lazer: "leisure", diversao: "leisure",
  exercicio: "exercise", exercicios: "exercise", academia: "exercise", familia: "family", projetos: "projects",
  projeto: "projects", reuniao: "meetings", reunioes: "meetings", viagem: "travel", viagens: "travel",
  outros: "other", outro: "other", outra: "other",
};

/** Palavras do título que sugerem a categoria ("dentista" -> Saúde): a Ive pergunta "Pode ser Saúde?". */
const PISTAS: [RegExp, string][] = [
  [/\b(dentista|medic[oa]|consulta|exame|remedio|vacina|farmacia|hospital|terapia)\b/, "health"],
  [/\b(academia|treino|corrida|caminhada|natacao|futebol|pilates|yoga)\b/, "exercise"],
  [/\b(compra[rs]?|mercado|supermercado|feira|padaria|acougue)\b/, "shopping"],
  [/\b(pagar|conta|boleto|fatura|banco|imposto|pix)\b/, "finance"],
  [/\b(escola|prova|licao|dever|tarefa de casa|trabalho da escola|aula|faculdade)\b/, "school"],
  [/\b(reuniao|call|chamada)\b/, "meetings"],
  [/\b(viagem|passagem|hotel|aeroporto|mala)\b/, "travel"],
  [/\b(limpar|lavar|arrumar|varrer|faxina|lixo|louca|roupa|cozinhar|consertar)\b/, "home"],
];

const SIM = /^(sim|s|pode|pode ser|claro|isso|isso mesmo|ok|beleza|certo|essa|e)\b/;
const NAO = /^(nao|nem|negativo)\b/;

export const nomeDaCategoria = (id: string, daFamilia: Categoria[]) =>
  [...PADRAO, ...daFamilia].find((c) => c.id === id)?.label || id;

function categorias(daFamilia: Categoria[]): Categoria[] {
  return [...PADRAO, ...daFamilia.filter((c) => c.label && !PADRAO.some((p) => p.id === c.id))];
}

export function sugerirCategoria(titulo: string): Categoria | null {
  const t = normalizar(titulo);
  const achada = PISTAS.find(([padrao]) => padrao.test(t));
  return achada ? PADRAO.find((c) => c.id === achada[1]) || null : null;
}

/** A categoria falada; "sim" aceita a sugestão pelo título. null: não achou. */
export function lerCategoria(falada: string, titulo: string, daFamilia: Categoria[]): Categoria | null {
  const t = normalizar(falada).replace(/^(?:a\s+)?categoria\s+/, "").replace(/^(?:e|em|na|no|de|pra|para)\s+/, "");
  if (!t) return null;
  if (SIM.test(t) && !SINONIMOS[t]) return sugerirCategoria(titulo);
  const todas = categorias(daFamilia);
  const porNome = todas.find((c) => normalizar(c.label) === t) || todas.find((c) => c.id === SINONIMOS[t]);
  if (porNome) return porNome;
  return todas.find((c) => normalizar(c.label).length >= 3 && new RegExp(`\\b${normalizar(c.label)}\\b`).test(t)) || null;
}

export function perguntaCategoria(titulo: string, daFamilia: Categoria[], antes = ""): string {
  const sugestao = sugerirCategoria(titulo);
  if (sugestao) return `${antes}Qual a categoria? Pode ser ${sugestao.label}?`;
  const nomes = categorias(daFamilia).slice(0, 6).map((c) => c.label);
  return `${antes}Qual a categoria? Por exemplo: ${nomes.join(", ")} ou Outros.`;
}

// ------------------------------------------------------------------ repetição

const DIAS: [RegExp, number][] = [
  [/\bdomingos?\b/, 0], [/\bsegundas?\b/, 1], [/\bter[cç]as?\b/, 2], [/\bquartas?\b/, 3], [/\bquintas?\b/, 4],
  [/\bsextas?\b/, 5], [/\bsabados?\b/, 6],
];

export interface Repeticao { recurrence: Recorrencia; weekDays?: number[] }

/** "não", "todo dia", "toda semana", "toda segunda e quarta", "de segunda a sexta", "todo mês", "todo ano". */
export function lerRepeticao(falada: string): Repeticao | null {
  const t = normalizar(falada);
  if (!t) return null;
  if (NAO.test(t) || /\b(nenhuma|so uma vez|so essa vez|nao repete|uma vez so|sem repetir)\b/.test(t)) return { recurrence: "none" };
  if (/\b(dias uteis|de segunda a sexta)\b/.test(t)) return { recurrence: "custom_weekly", weekDays: [1, 2, 3, 4, 5] };
  if (/\bfins? de semana\b/.test(t)) return { recurrence: "custom_weekly", weekDays: [0, 6] };
  const dias = DIAS.filter(([padrao]) => padrao.test(t)).map(([, d]) => d);
  if (dias.length) return { recurrence: "custom_weekly", weekDays: dias.sort((a, b) => a - b) };
  if (/\b(todo dia|todos os dias|diari[ao]|diariamente)\b/.test(t)) return { recurrence: "daily" };
  if (/\b(toda semana|todas as semanas|semanal|semanalmente)\b/.test(t)) return { recurrence: "weekly" };
  if (/\b(todo mes|todos os meses|mensal|mensalmente)\b/.test(t)) return { recurrence: "monthly" };
  if (/\b(todo ano|todos os anos|anual|anualmente)\b/.test(t)) return { recurrence: "yearly" };
  return null;
}

const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function falarRepeticao(r: Repeticao): string {
  switch (r.recurrence) {
    case "daily": return "todo dia";
    case "weekly": return "toda semana";
    case "monthly": return "todo mês";
    case "yearly": return "todo ano";
    case "custom_weekly": {
      const nomes = (r.weekDays || []).map((d) => NOMES_DIAS[d]);
      return nomes.length > 1 ? `toda ${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}` : `toda ${nomes[0] || "semana"}`;
    }
    default: return "";
  }
}

// ------------------------------------------------------------------ subtarefas e privada

export function lerSubtarefas(falada: string, categoria: string): Tarefa["subtasks"] | null {
  const t = String(falada || "").replace(/^\s*(?:as\s+)?subtarefas?\s*(?::|sao|são)?\s*/i, "").trim();
  if (!t) return null;
  if (NAO.test(normalizar(t)) || /^nenhuma/i.test(t)) return [];
  const partes = t.split(/\s*(?:,|;|\be\b)\s*/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  return partes.map((titulo) => ({ id: randomBytes(8).toString("hex"), title: (titulo.charAt(0).toUpperCase() + titulo.slice(1)).slice(0, 80),
                                   completed: false, category: categoria }));
}

/** true (privada), false (pública), null (não entendeu). Booleano vale como veio. */
export function lerPrivada(falada: unknown): boolean | null {
  if (typeof falada === "boolean") return falada;
  const t = normalizar(String(falada ?? ""));
  if (!t) return null;
  if (/\b(publica|publico|pra todos|pra familia|para a familia|todo mundo)\b/.test(t) || NAO.test(t) || t === "false") return false;
  if (/\b(privada|privado|so pra mim|so eu|particular|secreta)\b/.test(t) || SIM.test(t) || t === "true") return true;
  return null;
}

// ------------------------------------------------------------------ várias parecidas: qual delas

export function perguntaQual(varias: Tarefa[], hoje: string): string {
  const ditas = varias.slice(0, 3).map((t) => falarTarefa(t, hoje));
  const lista = ditas.length > 1 ? `${ditas.slice(0, -1).join(", ")} e ${ditas[ditas.length - 1]}` : ditas[0];
  const mais = varias.length > 3 ? ` (e mais ${varias.length - 3})` : "";
  return `Tem ${varias.length} parecidas: ${lista}${mais}. Qual delas?`;
}

const ORDINAIS = ["primeira", "segunda", "terceira", "quarta", "quinta"];

/** A resposta a "Qual delas?": a data ("a de sexta"), a hora ("a das 15h"), a ordem ("a primeira") ou o nome. */
export function escolher(varias: Tarefa[], qual: string, dataFalada: (s: string) => string | null,
                         horaFalada: (s: string) => string | null): Tarefa | null {
  const t = normalizar(qual).replace(/^(?:e\s+)?(?:a|o)\s+(?:de|do|da|das|dos)\s+/, "").replace(/^(?:de|do|da|das)\s+/, "");
  if (!t) return null;
  const unica = (lista: Tarefa[]) => (lista.length === 1 ? lista[0] : null);
  let hora: string | null = null;
  try { hora = horaFalada(t.replace(/^as\s+/, "")); } catch { hora = null; }
  if (hora && /\d/.test(t)) {
    const achada = unica(varias.filter((v) => v.dueTime === hora));
    if (achada) return achada;
  }
  const data = dataFalada(t);
  if (data) {
    const achada = unica(varias.filter((v) => v.dueDate === data));
    if (achada) return achada;
  }
  const ordem = ORDINAIS.findIndex((o) => new RegExp(`^(?:a\\s+)?${o}$`).test(t));
  const numero = /^(\d)$/.exec(t);
  const posicao = ordem >= 0 ? ordem : numero ? Number(numero[1]) - 1 : -1;
  if (posicao >= 0 && posicao < varias.length) return varias[posicao];
  return unica(varias.filter((v) => normalizar(v.title).includes(t.replace(/^(?:a|o)\s+/, ""))));
}
