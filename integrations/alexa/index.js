// Skill da Alexa para o Agenda Familiar (Alexa-hosted, Node.js, ask-sdk-core).
// Conversa com a API REST (agendaApi) usando um token pessoal criado no app:
// Configurações › Acesso pela API › Criar token. Cole o token em API_TOKEN.
// Atenção: o token age como a sua conta; a skill fica pessoal (só a sua agenda).
const Alexa = require("ask-sdk-core");
const https = require("https");

const API_URL = "https://us-central1-agendafamiliarkotlin.cloudfunctions.net/agendaApi";
const API_TOKEN = "agf_COLE_SEU_TOKEN_AQUI";
const TIME_ZONE = "America/Sao_Paulo";

// ---------- API ----------
function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      API_URL + path,
      {
        method,
        timeout: 7000,
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          const json = raw ? JSON.parse(raw) : {};
          if (res.statusCode >= 400) reject(new Error(json.detail || `Erro ${res.statusCode}`));
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

async function openTasks(from, to) {
  const query = `?status=open${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;
  return (await api("GET", `/v1/tasks${query}`)).tasks;
}
// Acha uma tarefa pendente pelo nome falado (exato, depois parcial).
async function findTask(spoken) {
  const term = normalize(spoken);
  const tasks = await openTasks();
  return (
    tasks.find((t) => normalize(t.title) === term) ||
    tasks.filter((t) => normalize(t.title).includes(term) || term.includes(normalize(t.title)))
  );
}

// ---------- Intents ----------
const LaunchRequestHandler = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "LaunchRequest",
  handle: (h) =>
    h.responseBuilder
      .speak("Agenda Familiar aqui. Você pode perguntar o que tem para hoje, criar uma tarefa ou concluir uma tarefa.")
      .reprompt("O que você quer fazer?")
      .getResponse(),
};

const ListTasksIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "ListTasksIntent",
  async handle(h) {
    const date = parseDate(slot(h, "date")) || localDate();
    const tasks = await openTasks(date, date);
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
    const tasks = await openTasks(undefined, addDays(localDate(), -1));
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
    const task = await api("POST", "/v1/tasks", body);
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
    const found = await findTask(title);
    const matches = Array.isArray(found) ? found : [found];
    if (!matches.length || !matches[0])
      return h.responseBuilder.speak(`Não achei nenhuma tarefa pendente chamada ${title}.`).getResponse();
    if (matches.length > 1)
      return h.responseBuilder
        .speak(`Achei mais de uma: ${list(matches.slice(0, 4).map((t) => t.title))}. Diga o nome completo.`)
        .reprompt("Qual delas?")
        .getResponse();
    const result = await api("POST", `/v1/tasks/${matches[0].id}/complete`);
    const next = result.nextDueDate ? ` A próxima ficou para ${spokenDate(result.nextDueDate)}.` : "";
    return h.responseBuilder.speak(`Feito, ${matches[0].title} concluída.${next}`).getResponse();
  },
};

const HelpIntentHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "AMAZON.HelpIntent",
  handle: (h) =>
    h.responseBuilder
      .speak(
        "Experimente: o que tenho para hoje; o que está atrasado; criar tarefa comprar pão amanhã às dez; ou concluir tarefa comprar pão.",
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

// Erros da API (token inválido, sem internet, campo errado) viram fala.
const ErrorHandler = {
  canHandle: () => true,
  handle(h, error) {
    console.log("Erro:", error && error.message);
    const speech = /token/i.test(error && error.message)
      ? "Não consegui entrar na sua agenda. Confira o token da skill."
      : `Não deu certo: ${(error && error.message) || "tente de novo"}.`;
    return h.responseBuilder.speak(speech).getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ListTasksIntentHandler,
    OverdueTasksIntentHandler,
    CreateTaskIntentHandler,
    CompleteTaskIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent("agenda-familiar/alexa")
  .lambda();
