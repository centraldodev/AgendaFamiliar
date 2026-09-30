"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ive = void 0;
/**
 * A função "ive" (a Agenda Familiar controlada pela assistente Ive; ver app.ts).
 * Publicar: firebase deploy --only functions:ive
 */
process.env.TZ = "America/Sao_Paulo"; // "hoje" e as datas das tarefas no horário do app, não em UTC
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("./app");
const repo_1 = require("./repo");
const app = (0, app_1.createIveApp)({
    repo: (0, repo_1.firestoreRepo)((0, firestore_1.getFirestore)()),
    verificarLogin: async (idToken) => (await (0, auth_1.getAuth)().verifyIdToken(idToken, true)).uid,
});
exports.ive = (0, https_1.onRequest)({ region: "us-central1", maxInstances: 3, concurrency: 20, timeoutSeconds: 30, memory: "256MiB", invoker: "public" }, app);
//# sourceMappingURL=index.js.map