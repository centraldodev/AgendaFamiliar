import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { handleApi } from "./api/handleApi";
import { handleOAuth } from "./oauth/handleOAuth";
import { alexaClientSecret } from "./oauth/config";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { callableOptions } from "./config/callableOptions";
import { handleFamily } from "./controllers/handleFamily";
import { handleFamilyAdmin } from "./controllers/handleFamilyAdmin";
import { handleFamilyOverview } from "./controllers/handleFamilyOverview";
import { handleAccount } from "./controllers/handleAccount";
import { handleCleanup } from "./controllers/handleCleanup";
import { handleDueTasks } from "./controllers/handleDueTasks";
import { handlePushToken } from "./controllers/handlePushToken";
import { handleTaskCreated } from "./controllers/handleTaskCreated";
import { handleTaskOccurrence } from "./controllers/handleTaskOccurrence";
import { handleTaskUpdated } from "./controllers/handleTaskUpdated";
import { appTimeZone } from "./services/dueReminder";
export const agendaSimpleFamily = onCall(callableOptions, handleFamily);
export const agendaFamilyOverview = onCall(callableOptions, handleFamilyOverview);
export const agendaFamilyAdmin = onCall(callableOptions, handleFamilyAdmin);
export const agendaPushToken = onCall(callableOptions, handlePushToken);
export const agendaTaskOccurrence = onCall(callableOptions, handleTaskOccurrence);
export const agendaApi = onRequest({ ...callableOptions, maxInstances: 3 }, handleApi);
// Vinculação de conta da Alexa (OAuth 2.0). Precisa do segredo ALEXA_CLIENT_SECRET.
export const agendaOAuth = onRequest(
  { ...callableOptions, maxInstances: 3, secrets: [alexaClientSecret] },
  handleOAuth,
);
export const agendaAccount = onCall(callableOptions, handleAccount);
export const agendaTaskCreated = onDocumentCreated(
  { document: "tasks/{taskId}", region: callableOptions.region },
  handleTaskCreated,
);
export const agendaTaskUpdated = onDocumentUpdated(
  { document: "tasks/{taskId}", region: callableOptions.region },
  handleTaskUpdated,
);
export const agendaDueReminders = onSchedule(
  { schedule: "every 5 minutes", timeZone: appTimeZone, region: callableOptions.region },
  handleDueTasks,
);
export const agendaCleanup = onSchedule(
  { schedule: "every day 03:30", timeZone: appTimeZone, region: callableOptions.region },
  handleCleanup,
);
