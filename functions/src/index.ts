import { onCall } from "firebase-functions/v2/https";
import { callableOptions } from "./config/callableOptions";
import { handleFamily } from "./controllers/handleFamily";
import { handleListTasks } from "./controllers/handleListTasks";
export const agendaSimpleFamily = onCall(callableOptions, handleFamily);
export const agendaSimpleTasks = onCall(callableOptions, handleListTasks);
