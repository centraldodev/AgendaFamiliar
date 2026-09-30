/**
 * A ficha da Agenda Familiar para a Ive (protocolo ive-app/1), servida em GET /ive.json.
 * As frases são sobre a fala já normalizada (minúsculas, sem acento, sem pontuação, sem o "Ive" do começo) e não
 * podem roubar o que a Ive já entende (a agenda do Mac: "o que eu tenho hoje?"): por isso falam de "família" ou
 * de "tarefa". As falas vêm da resposta (campo "fala"): a função sabe quando foi pedido de aprovação.
 */
const DIA = "hoje|amanha|depois\\s+de\\s+amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia\\s+\\d{1,2}(?:\\s+\\d{1,2})?";
const HORA = "\\d{1,2}(?:h\\d{0,2}|\\s+horas?)?(?:\\s+da\\s+(?:manha|tarde|noite))?";

export const FICHA = {
  protocolo: "ive-app/1",
  id: "agenda_familiar",
  titulo: "Agenda Familiar",
  descricao: "Tarefas da família: as de hoje, pendentes, criar, concluir, remarcar e apagar.",
  tipo: "app",
  versao: "1",
  base: "https://us-central1-agendafamiliarkotlin.cloudfunctions.net/ive",
  autenticacao: { tipo: "token", assinatura: true },
  acoes: {
    tarefas: {
      descricao: "dizer as tarefas da família de um dia (hoje, amanhã, um dia da semana) ou da semana",
      metodo: "GET", caminho: "/tarefas", efeito: "leitura",
      args: { quando: { descricao: "hoje, amanhã, um dia da semana, semana ou pendentes", max: 30 } },
      frases: [
        `^(?:quais\\s+(?:sao\\s+)?)?(?:as\\s+)?tarefas\\s+(?:da\\s+familia|de\\s+casa)(?:\\s+(?:(?:de|pra|para|da)\\s+)?(?P<quando>${DIA}|essa\\s+semana|semana))?$`,
        `^o\\s+que\\s+tem\\s+na\\s+agenda\\s+(?:da\\s+familia|familiar)(?:\\s+(?:(?:de|pra|para|da)\\s+)?(?P<quando>${DIA}|essa\\s+semana|semana))?$`,
      ],
      exemplos: ["quais as tarefas da família hoje", "o que tem na agenda da família amanhã", "tarefas da família essa semana"],
    },
    tarefas_pendentes: {
      descricao: "dizer todas as tarefas pendentes da família",
      metodo: "GET", caminho: "/tarefas/pendentes", efeito: "leitura",
      frases: ["^(?:quais\\s+(?:sao\\s+)?)?(?:as\\s+)?tarefas\\s+(?:pendentes|abertas|atrasadas)\\s+da\\s+familia$"],
      exemplos: ["quais são as tarefas pendentes da família", "tarefas atrasadas da família"],
    },
    criar_tarefa: {
      descricao: "criar uma tarefa na agenda da família",
      metodo: "POST", caminho: "/tarefas", efeito: "cria",
      args: {
        titulo: { descricao: "o que precisa ser feito", max: 120 },
        quando: { descricao: "o dia: hoje, amanhã, um dia da semana ou uma data", max: 30 },
        hora: { descricao: "a hora, como 15h ou 15:30", max: 20 },
        categoria: { descricao: "casa, trabalho, escola, compras, saúde, família...", max: 40 },
        privada: { descricao: "sim quando só a pessoa deve ver", tipo: "sim_nao" },
      },
      obrigatorios: ["titulo"],
      frases: [`^(?:cria|crie|adiciona|adicione|coloca|coloque|poe|bota)\\s+(?:a\\s+|uma\\s+)?tarefa\\s+(?P<titulo>.+?)(?:\\s+(?:pra|para|na|no)\\s+(?P<quando>${DIA}))?(?:\\s+as\\s+(?P<hora>${HORA}))?$`],
      exemplos: ["cria a tarefa comprar leite", "adiciona a tarefa levar o cachorro no veterinário pra sexta às 15h"],
      desfazer: { acao: "apagar_tarefa", args: { id: "{id}" } },
    },
    concluir_tarefa: {
      descricao: "marcar uma tarefa da família como feita",
      metodo: "POST", caminho: "/tarefas/concluir", efeito: "altera",
      args: { tarefa: { descricao: "o nome da tarefa, como foi falado", max: 120 } },
      obrigatorios: ["tarefa"],
      frases: ["^(?:ja\\s+)?(?:terminei|fiz|fechei|finalizei)\\s+(?:a\\s+)?tarefa\\s+(?P<tarefa>.+)$",
               "^(?:da|de)\\s+baixa\\s+na\\s+tarefa\\s+(?P<tarefa>.+)$",
               "^a\\s+tarefa\\s+(?P<tarefa>.+?)\\s+(?:ta|esta|ja\\s+ta|ja\\s+esta)\\s+(?:feita|pronta|concluida)$"],
      exemplos: ["terminei a tarefa comprar leite", "já fiz a tarefa lavar o carro", "dá baixa na tarefa pagar a conta de luz"],
      desfazer: { acao: "reabrir_tarefa", args: { id: "{id}", proxima: "{proxima}" } },
    },
    reabrir_tarefa: {
      descricao: "reabrir uma tarefa concluída (usado pelo desfazer)",
      metodo: "POST", caminho: "/tarefas/{id}/reabrir", efeito: "altera",
      args: { id: { descricao: "o id da tarefa", max: 64 }, proxima: { descricao: "a ocorrência seguinte a tirar", max: 64 } },
      obrigatorios: ["id"],
    },
    remarcar_tarefa: {
      descricao: "mudar o dia (e a hora) de uma tarefa da família",
      metodo: "PATCH", caminho: "/tarefas/remarcar", efeito: "altera",
      args: {
        tarefa: { descricao: "o nome da tarefa, como foi falado", max: 120 },
        quando: { descricao: "o novo dia", max: 30 },
        hora: { descricao: "a nova hora", max: 20 },
      },
      obrigatorios: ["tarefa", "quando"],
      frases: [`^(?:passa|passe|muda|mude)\\s+(?:a\\s+)?tarefa\\s+(?P<tarefa>.+?)\\s+(?:pra|para)\\s+(?P<quando>${DIA})(?:\\s+as\\s+(?P<hora>${HORA}))?$`],
      exemplos: ["passa a tarefa lavar o carro pra sábado", "muda a tarefa dentista da ana para sexta às 10h"],
      desfazer: { acao: "remarcar_tarefa_id", args: { id: "{id}", quando: "{data_anterior}", hora: "{hora_anterior}" } },
    },
    remarcar_tarefa_id: {
      descricao: "mudar o dia de uma tarefa (usado pelo desfazer)",
      metodo: "PATCH", caminho: "/tarefas/{id}/remarcar", efeito: "altera",
      args: { id: { descricao: "o id da tarefa", max: 64 }, quando: { descricao: "o dia", max: 30 },
              hora: { descricao: "a hora, ou - sem hora", max: 20 } },
      obrigatorios: ["id", "quando"],
    },
    apagar_tarefa: {
      descricao: "apagar uma tarefa da família",
      metodo: "DELETE", caminho: "/tarefas", efeito: "apaga",
      args: { tarefa: { descricao: "o nome da tarefa, como foi falado", max: 120 },
              id: { descricao: "o id da tarefa (usado pelo desfazer)", max: 64 } },
      frases: ["^(?:apaga|apague|exclui|exclua|remove|remova|tira|tire)\\s+a\\s+tarefa\\s+(?P<tarefa>.+)$"],
      exemplos: ["apaga a tarefa lavar o carro"],
      desfazer: { acao: "restaurar_tarefa", args: { id: "{id}" } },
    },
    restaurar_tarefa: {
      descricao: "trazer de volta uma tarefa apagada (usado pelo desfazer)",
      metodo: "POST", caminho: "/tarefas/{id}/restaurar", efeito: "altera",
      args: { id: { descricao: "o id da tarefa", max: 64 } },
      obrigatorios: ["id"],
    },
  },
};
