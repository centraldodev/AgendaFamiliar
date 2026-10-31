// Migração única: normaliza os dados do app antigo para o formato do app novo
// e apaga coleções que não são mais usadas.
//
// Simulação (padrão, não grava nada):   node scripts/migrateLegacy.cjs
// Aplicar:                              node scripts/migrateLegacy.cjs --apply
// Também apagar coleções desconhecidas: node scripts/migrateLegacy.cjs --apply --delete-unknown
//
// Credenciais: `gcloud auth application-default login` (conta com acesso ao projeto).
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const projectId = "agendafamiliarkotlin";
const apply = process.argv.includes("--apply");
const deleteUnknown = process.argv.includes("--delete-unknown");
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

// Coleções usadas pelo app novo. Qualquer outra é do app antigo.
const inUse = new Set([
  "users", "families", "tasks", "joinRequests", "rateLimits", "dueReminders", "categories", "apiTokens",
]);
// Do app antigo e sabidamente sem uso: sempre apagadas.
const obsolete = ["approvals", "ivePedidos", "iveTokens"];

const stats = {};
const count = (key, n = 1) => (stats[key] = (stats[key] ?? 0) + n);
let batch = db.batch();
let pending = 0;
async function write(op) {
  if (!apply) return;
  op(batch);
  if (++pending >= 400) {
    await batch.commit();
    batch = db.batch();
    pending = 0;
  }
}
async function flush() {
  if (apply && pending) await batch.commit();
}

async function migrateTasks() {
  const snap = await db.collection("tasks").get();
  count("tarefas lidas", snap.size);
  for (const doc of snap.docs) {
    const t = doc.data();
    // Exclusão suave do app antigo: o app novo apaga de verdade.
    if (t.deletedAt) {
      count("tarefas com deletedAt apagadas");
      await write((b) => b.delete(doc.ref));
      continue;
    }
    const patch = {};
    if (typeof t.createdBy !== "string" || !t.createdBy) {
      if (typeof t.userId === "string" && t.userId) patch.createdBy = t.userId;
      else count("tarefas sem autor (mantidas, revisar)");
    }
    if (typeof t.userId !== "string" && typeof (patch.createdBy ?? t.createdBy) === "string")
      patch.userId = patch.createdBy ?? t.createdBy;
    if (typeof t.isPrivate !== "boolean") patch.isPrivate = false;
    if (typeof t.completed !== "boolean") patch.completed = false;
    if (typeof t.description !== "string") patch.description = "";
    if (t.dueTime === undefined || t.dueTime === "") patch.dueTime = null;
    if (typeof t.recurrence !== "string") patch.recurrence = "none";
    if (!Array.isArray(t.subtasks)) patch.subtasks = [];
    // Sem updatedAt a limpeza de concluídas nunca alcança a tarefa.
    if (!t.updatedAt || typeof t.updatedAt.toMillis !== "function")
      patch.updatedAt = t.createdAt && typeof t.createdAt.toMillis === "function" ? t.createdAt : FieldValue.serverTimestamp();
    if (Object.keys(patch).length) {
      for (const key of Object.keys(patch)) count(`tarefas: preencher ${key}`);
      await write((b) => b.update(doc.ref, patch));
    }
  }
}

async function migrateUsers() {
  const snap = await db.collection("users").get();
  count("usuários lidos", snap.size);
  for (const doc of snap.docs) {
    const role = doc.data().role;
    // Sem papel (undefined/null) já vale como "user"; só os papéis antigos são trocados.
    if (role != null && role !== "admin" && role !== "user") {
      count(`usuários: papel "${role}" -> "user"`);
      await write((b) => b.update(doc.ref, { role: "user" }));
    }
  }
}

async function deleteCollection(name) {
  const ref = db.collection(name);
  for (;;) {
    const snap = await ref.limit(400).get();
    if (snap.empty) return;
    count(`coleção ${name}: documentos apagados`, snap.size);
    if (!apply) return; // na simulação mostra só o primeiro lote
    // recursiveDelete também remove subcoleções.
    for (const doc of snap.docs) await db.recursiveDelete(doc.ref);
  }
}

async function main() {
  console.log(apply ? "APLICANDO mudanças em" : "SIMULAÇÃO (nada é gravado) em", projectId);
  await migrateTasks();
  await migrateUsers();
  await flush();
  const roots = (await db.listCollections()).map((c) => c.id);
  for (const name of roots) {
    if (obsolete.includes(name)) await deleteCollection(name);
    else if (!inUse.has(name)) {
      count(`coleção desconhecida: ${name}`);
      if (deleteUnknown) await deleteCollection(name);
    }
  }
  console.table(stats);
  if (!apply) console.log("Confira acima e rode de novo com --apply.");
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
