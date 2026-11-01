// Skill da Alexa para o Agenda Familiar (Alexa-hosted, Node.js, ask-sdk-core).
// Conversa com a API REST (agendaApi) usando a vinculação de conta (OAuth): cada pessoa
// vincula a própria conta no app Alexa e a skill recebe o token dela em cada pedido.
// Não há token no código: a mesma skill serve a todos, cada um com a sua agenda.
const Alexa = require("ask-sdk-core");
const https = require("https");

const API_URL = "https://us-central1-agendafamiliarkotlin.cloudfunctions.net/agendaApi";
const TIME_ZONE = "America/Sao_Paulo";

// ---------- API ----------
// Sem vinculação (ou vinculação desfeita no app): pede para vincular de novo.
class LinkRequired extends Error {}
const tokenOf = (handlerInput) => Alexa.getAccountLinkingAccessToken(handlerInput.requestEnvelope);

function api(handlerInput, method, path, body) {
  const token = tokenOf(handlerInput);
  if (!token) return Promise.reject(new LinkRequired());
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      API_URL + path,
      {
        method,
        timeout: 7000,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let json = {};
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {}
          if (res.statusCode === 401) reject(new LinkRequired());
          else if (res.statusCode >= 400) reject(new Error(json.detail || `Erro ${res.statusCode}`));
          else resolve(json);
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("A agenda demorou para responder.")));
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ---------- Datas e texto ----------
const localDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date); // AAAA-MM-DD
const addDays = (iso, days) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const normalize = (text) =>
  String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const spokenDate = (iso) => {
  const today = localDate();
  if (iso === today) return "hoje";
  if (iso === addDays(today, 1)) return "amanhã";
  const [, m, d] = iso.split("-");
  return `dia ${Number(d)} do ${Number(m)}`;
};
const list = (items) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
const describe = (task) => `${task.title}${task.dueTime ? ` às ${task.dueTime.replace(":", " e ")}` : ""}`;
const slot = (handlerInput, name) => Alexa.getSlotValue(handlerInput.requestEnvelope, name);

// Datas da Alexa (AMAZON.DATE) podem vir como "2026-11-02", "2026-W45" etc.; aceita só o dia.
const parseDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : null);

async function openTasks(h, from, to) {
  const query = `?status=open${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;
  return (await api(h, "GET", `/v1/tasks${query}`)).tasks;
}
// Acha uma tarefa pendente pelo nome falado (exato, depois parcial).
async function findTask(h, spoken) {
  const term = normalize(spoken);
  const tasks = await openTasks(h);
  return (
    tasks.find((t) => normalize(t.title) === term) ||
    tasks.filter((t) => normalize(t.title).includes(term) || term.includes(normalize(t.title)))
  );
}

// Uma tarefa pelo nome, ou uma resposta pronta (nenhuma / mais de uma).
async function pickTask(h, title) {
  const found = await findTask(h, title);
  const matches = (Array.isArray(found) ? found : [found]).filter(Boolean);
  if (!matches.length)
    return { response: h.responseBuilder.speak(`Não achei nenhuma tarefa pendente chamada ${title}.`).getResponse() };
  if (matches.length > 1)
    return {
      response: h.responseBuilder
        .speak(`Achei mais de uma: ${list(matches.slice(0, 4).map((t) => t.title))}. Diga o nome completo.`)
        .reprompt("Qual delas?")
        .getResponse(),
    };
  return { task: matches[0] };
}
const isIntent = (h, ...names) =>
  Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" && names.includes(Alexa.getIntentName(h.requestEnvelope));
const session = (h) => h.attributesManager.getSessionAttributes();

// ---------- Intents ----------
const LaunchRequestHandler = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "LaunchRequest",
  handle: (h) =>
    !tokenOf(h)
      ? linkResponse(h)
      : h.responseBuilder
          .speak("Agenda Familiar aqui. Você pode perguntar o que tem para hoje, criar, concluir, remarcar ou apagar uma tarefa.")
          .reprompt("O que você quer fazer?")
          .getResponse(),
};

const ListTasksIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "ListTasksIntent",
  async handle(h) {
    const date = parseDate(slot(h, "date")) || localDate();
    const tasks = await openTasks(h, date, date);
    const when = spokenDate(date);
    const speech = tasks.length
      ? `Para ${when} ${tasks.length === 1 ? "tem uma tarefa" : `tem ${tasks.length} tarefas`}: ${list(tasks.slice(0, 8).map(describe))}.`
      : `Nada pendente para ${when}.`;
    return h.responseBuilder.speak(speech).getResponse();
  },
};

const OverdueTasksIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "OverdueTasksIntent",
  async handle(h) {
    const tasks = await openTasks(h, undefined, addDays(localDate(), -1));
    const speech = tasks.length
      ? `Você tem ${tasks.length === 1 ? "uma tarefa atrasada" : `${tasks.length} tarefas atrasadas`}: ${list(tasks.slice(0, 8).map((t) => t.title))}.`
      : "Nenhuma tarefa atrasada. Muito bem!";
    return h.responseBuilder.speak(speech).getResponse();
  },
};

const CreateTaskIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "CreateTaskIntent",
  async handle(h) {
    const title = slot(h, "taskName");
    if (!title) return h.responseBuilder.speak("Qual é a tarefa?").reprompt("Diga o nome da tarefa.").getResponse();
    const dueDate = parseDate(slot(h, "date")) || localDate();
    const time = slot(h, "time"); // AMAZON.TIME: "15:00" ou "MO"/"AF" (manhã/tarde) — só aceita hora exata
    const body = {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      dueDate,
      category: "other",
      ...(/^\d{2}:\d{2}$/.test(time || "") ? { dueTime: time } : {}),
    };
    const task = await api(h, "POST", "/v1/tasks", body);
    return h.responseBuilder
      .speak(`Pronto, criei ${describe(task)} para ${spokenDate(task.dueDate)}.`)
      .getResponse();
  },
};

const CompleteTaskIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "CompleteTaskIntent",
  async handle(h) {
    const title = slot(h, "title");
    if (!title) return h.responseBuilder.speak("Qual tarefa você concluiu?").reprompt("Diga o nome da tarefa.").getResponse();
    const { task, response } = await pickTask(h, title);
    if (response) return response;
    const result = await api(h, "POST", `/v1/tasks/${task.id}/complete`);
    const next = result.nextDueDate ? ` A próxima ficou para ${spokenDate(result.nextDueDate)}.` : "";
    return h.responseBuilder.speak(`Feito, ${task.title} concluída.${next}`).getResponse();
  },
};

// Excluir não tem volta: guarda a tarefa na sessão e pede um "sim".
const DeleteTaskIntentHandler = {
  canHandle: (h) => isIntent(h, "DeleteTaskIntent"),
  async handle(h) {
    const title = slot(h, "title");
    if (!title) return h.responseBuilder.speak("Qual tarefa você quer apagar?").reprompt("Diga o nome da tarefa.").getResponse();
    const { task, response } = await pickTask(h, title);
    if (response) return response;
    session(h).pendingDelete = { id: task.id, title: task.title };
    return h.responseBuilder
      .speak(`Apagar ${task.title}? Isso não pode ser desfeito. Diga sim ou não.`)
      .reprompt(`Apagar ${task.title}? Sim ou não?`)
      .getResponse();
  },
};

const YesIntentHandler = {
  canHandle: (h) => isIntent(h, "AMAZON.YesIntent") && !!session(h).pendingDelete,
  async handle(h) {
    const { id, title } = session(h).pendingDelete;
    delete session(h).pendingDelete;
    await api(h, "DELETE", `/v1/tasks/${id}`);
    return h.responseBuilder.speak(`Pronto, apaguei ${title}.`).getResponse();
  },
};

const NoIntentHandler = {
  canHandle: (h) => isIntent(h, "AMAZON.NoIntent", "AMAZON.YesIntent"),
  handle(h) {
    const pending = session(h).pendingDelete;
    delete session(h).pendingDelete;
    return h.responseBuilder.speak(pending ? `Tudo bem, ${pending.title} continua na agenda.` : "Tudo bem.").getResponse();
  },
};

// Remarcar: muda só a data e/ou a hora.
const RescheduleTaskIntentHandler = {
  canHandle: (h) => isIntent(h, "RescheduleTaskIntent"),
  async handle(h) {
    const title = slot(h, "taskName");
    if (!title) return h.responseBuilder.speak("Qual tarefa você quer remarcar?").reprompt("Diga o nome da tarefa.").getResponse();
    const date = parseDate(slot(h, "date"));
    const time = slot(h, "time");
    const body = {
      ...(date ? { dueDate: date } : {}),
      ...(/^\d{2}:\d{2}$/.test(time || "") ? { dueTime: time } : {}),
    };
    if (!Object.keys(body).length)
      return h.responseBuilder
        .speak(`Para quando você quer remarcar ${title}? Diga o dia ou a hora.`)
        .reprompt("Diga, por exemplo: remarcar " + title + " para amanhã às dez.")
        .getResponse();
    const { task, response } = await pickTask(h, title);
    if (response) return response;
    const updated = await api(h, "PATCH", `/v1/tasks/${task.id}`, body);
    return h.responseBuilder.speak(`Pronto, ${describe(updated)} ficou para ${spokenDate(updated.dueDate)}.`).getResponse();
  },
};

const HelpIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "AMAZON.HelpIntent",
  handle: (h) =>
    h.responseBuilder
      .speak(
        "Experimente: o que tenho para hoje; o que está atrasado; criar tarefa comprar pão amanhã às dez; concluir tarefa comprar pão; remarcar comprar pão para sexta; ou apagar tarefa comprar pão.",
      )
      .reprompt("O que você quer fazer?")
      .getResponse(),
};

const CancelAndStopIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    ["AMAZON.CancelIntent", "AMAZON.StopIntent"].includes(Alexa.getIntentName(h.requestEnvelope)),
  handle: (h) => h.responseBuilder.speak("Até logo!").getResponse(),
};

const FallbackIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "AMAZON.FallbackIntent",
  handle: (h) =>
    h.responseBuilder.speak("Não entendi. Diga ajuda para ver o que eu sei fazer.").reprompt("O que você quer fazer?").getResponse(),
};

const SessionEndedRequestHandler = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "SessionEndedRequest",
  handle: (h) => h.responseBuilder.getResponse(),
};

// Mostra o cartão "Vincular conta" no app Alexa.
function linkResponse(h) {
  return h.responseBuilder
    .speak("Para usar a Agenda Familiar, vincule sua conta. Mandei um cartão para o app Alexa no seu celular.")
    .withLinkAccountCard()
    .getResponse();
}

// Erros da API (sem vinculação, sem internet, campo errado) viram fala.
const ErrorHandler = {
  canHandle: () => true,
  handle(h, error) {
    if (error instanceof LinkRequired) return linkResponse(h);
    console.log("Erro:", error && error.message);
    return h.responseBuilder.speak(`Não deu certo: ${(error && error.message) || "tente de novo"}.`).getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ListTasksIntentHandler,
    OverdueTasksIntentHandler,
    CreateTaskIntentHandler,
    CompleteTaskIntentHandler,
    DeleteTaskIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    RescheduleTaskIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent("agenda-familiar/alexa")
  .lambda();
