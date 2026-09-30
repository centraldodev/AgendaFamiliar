/**
 * Regras da agenda usadas pela Ive: as MESMAS do app, portadas sem mudança.
 *
 * - próxima data de uma tarefa recorrente: src/domain/services/RecurrenceCalculator.ts (+ utils/dateParser.ts)
 * - quem vê: firestore.rules (tarefas da família; privadas só para quem criou) e utils/taskPermissions.ts
 * - quem muda: firestore.rules (quem criou, ou admin se não for privada); dependente pede aprovação (store/taskStore.ts)
 * Mudou a regra no app? Mude aqui também (tests/ive.test.cjs confere os casos principais).
 * Datas "YYYY-MM-DD" no horário local: a função roda com TZ=America/Sao_Paulo.
 */

export type Recorrencia = "none" | "daily" | "weekly" | "custom_weekly" | "monthly" | "yearly";
export type Papel = "admin" | "parent" | "dependent";

export interface Tarefa {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string | null;
  category: string;
  completed: boolean;
  recurrence: Recorrencia;
  subtasks?: { id: string; title: string; completed: boolean; category: string }[];
  familyId: string;
  createdBy: string;
  isPrivate?: boolean;
  deleted?: boolean;
  weekDays?: number[];
  recurrenceEndDate?: string;
}

export interface Pessoa {
  uid: string;
  familyId?: string;
  role?: Papel;
  nome: string;
}

// ------------------------------------------------------------------ datas (dateParser.ts)

export function lerData(texto: string): Date {
  const [ano, mes, dia] = texto.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function escreverData(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function somarDias(texto: string, dias: number): string {
  const data = lerData(texto);
  data.setDate(data.getDate() + dias);
  return escreverData(data);
}

// ------------------------------------------------------------------ recorrência (RecurrenceCalculator.ts)

export function proximaData(atual: string, recorrencia: Recorrencia, diasDaSemana?: number[]): string {
  if (recorrencia === "none") return atual;
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
      } else {
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

export function visivel(t: Tarefa, p: Pessoa): boolean {
  return !t.deleted && !!p.familyId && t.familyId === p.familyId && (!t.isPrivate || t.createdBy === p.uid);
}

/** "sim": muda direto; "aprovacao": dependente, vira pedido para o admin; "nao": sem permissão. */
export function podeMudar(t: Tarefa, p: Pessoa): "sim" | "aprovacao" | "nao" {
  if (!visivel(t, p)) return "nao";
  if (p.role === "dependent") return "aprovacao";
  if (t.createdBy === p.uid || (p.role === "admin" && !t.isPrivate)) return "sim";
  return "nao";
}

// ------------------------------------------------------------------ achar pelo nome falado

export function normalizar(texto: string): string {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** A tarefa que a pessoa disse ("comprar leite"): exata, depois começa com, depois contém. Várias: pergunta qual. */
export function acharPorNome(tarefas: Tarefa[], nome: string): { tarefa?: Tarefa; varias?: Tarefa[] } {
  const alvo = normalizar(nome).replace(/^(a|o|as|os)\s+/, "");
  if (!alvo) return {};
  for (const teste of [(t: string) => t === alvo, (t: string) => t.startsWith(alvo), (t: string) => t.includes(alvo)]) {
    const achadas = tarefas.filter((t) => teste(normalizar(t.title)));
    if (achadas.length === 1) return { tarefa: achadas[0] };
    if (achadas.length > 1) {
      const pendentes = achadas.filter((t) => !t.completed);
      if (pendentes.length === 1) return { tarefa: pendentes[0] };
      return { varias: achadas };
    }
  }
  return {};
}

// ------------------------------------------------------------------ como falar

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function falarData(data: string, hoje: string): string {
  if (data === hoje) return "hoje";
  if (data === somarDias(hoje, 1)) return "amanhã";
  if (data === somarDias(hoje, -1)) return "ontem";
  const dias = Math.round((lerData(data).getTime() - lerData(hoje).getTime()) / 86_400_000);
  if (dias > 1 && dias < 7) return SEMANA[lerData(data).getDay()];
  const [, mes, dia] = data.split("-");
  return `dia ${Number(dia)}/${Number(mes)}`;
}

export function falarHora(hora?: string | null): string {
  if (!hora || !/^\d{1,2}:\d{2}$/.test(hora)) return "";
  const [h, m] = hora.split(":").map(Number);
  return `${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

export function falarTarefa(t: Tarefa, hoje: string, comData = true): string {
  const hora = falarHora(t.dueTime);
  const quando = comData ? falarData(t.dueDate, hoje) : "";
  return [t.title, quando, hora ? `às ${hora}` : ""].filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ categorias

const CATEGORIAS: Record<string, string> = {
  casa: "home", lar: "home", trabalho: "work", servico: "work", escola: "school", estudo: "school",
  financas: "finance", financeiro: "finance", dinheiro: "finance", saude: "health", medico: "health",
  compras: "shopping", mercado: "shopping", lazer: "leisure", diversao: "leisure", exercicio: "exercise",
  academia: "exercise", familia: "family", projetos: "projects", projeto: "projects", reuniao: "meetings",
  reunioes: "meetings", viagem: "travel", viagens: "travel", outros: "other", outro: "other",
};

/** A categoria falada -> id do app (as padrão pelo nome em português; as da família pelo rótulo). */
export function categoriaDe(falada: string, daFamilia: { id: string; label: string }[]): string {
  const alvo = normalizar(falada);
  if (!alvo) return "other";
  return CATEGORIAS[alvo] || daFamilia.find((c) => normalizar(c.label) === alvo)?.id || "other";
}
