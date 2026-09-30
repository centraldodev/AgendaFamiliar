/**
 * A função "ive" (a Agenda Familiar controlada pela assistente Ive; ver app.ts).
 * Publicar: firebase deploy --only functions:ive
 */
process.env.TZ = "America/Sao_Paulo";  // "hoje" e as datas das tarefas no horário do app, não em UTC

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { createIveApp } from "./app";
import { firestoreRepo } from "./repo";

const app = createIveApp({
  repo: firestoreRepo(getFirestore()),
  verificarLogin: async (idToken) => (await getAuth().verifyIdToken(idToken, true)).uid,
});

export const ive = onRequest(
  { region: "us-central1", maxInstances: 3, concurrency: 20, timeoutSeconds: 30, memory: "256MiB", invoker: "public" },
  app,
);
