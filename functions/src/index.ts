import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { handleApi } from "./api/handleApi";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { callableOptions } from "./config/callableOptions";
import { handleFamily } from "./controllers/handleFamily";
import { handleFamilyAdmin } from "./controllers/handleFamilyAdmin";
import { handleFamilyOverview } from "./controllers/handleFamilyOverview";
import { handleCleanup } from "./controllers/handleCleanup";
import { handleDueTasks } from "./controllers/handleDueTasks";
import { handleListTasks } from "./controllers/handleListTasks";
import { handlePushToken } from "./controllers/handlePushToken";
import { handleTaskCreated } from "./controllers/handleTaskCreated";
import { handleTaskOccurrence } from "./controllers/handleTaskOccurrence";
import { appTimeZone } from "./services/dueReminder";
export const agendaSimpleFamily = onCall(callableOptions, handleFamily);
export const agendaSimpleTasks = onCall(callableOptions, handleListTasks);
export const agendaFamilyOverview = onCall(callableOptions, handleFamilyOverview);
export const agendaFamilyAdmin = onCall(callableOptions, handleFamilyAdmin);
export const agendaPushToken = onCall(callableOptions, handlePushToken);
export const agendaTaskOccurrence = onCall(callableOptions, handleTaskOccurrence);
export const agendaApi = onRequest({ ...callableOptions, maxInstances: 3 }, handleApi);
export const agendaTaskCreated = onDocumentCreated(
  { document: "tasks/{taskId}", region: callableOptions.region },
  handleTaskCreated,
);
export const agendaDueReminders = onSchedule(
  { schedule: "every 5 minutes", timeZone: appTimeZone, region: callableOptions.region },
  handleDueTasks,
);
export const agendaCleanup = onSchedule(
  { schedule: "every day 03:30", timeZone: appTimeZone, region: callableOptions.region },
  handleCleanup,
);
