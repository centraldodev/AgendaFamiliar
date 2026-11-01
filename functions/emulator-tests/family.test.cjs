// Executado com o emulador do Firestore: npm run test:family (na raiz do projeto).
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const project = process.env.GCLOUD_PROJECT || "demo-agenda-familiar";
process.env.GCLOUD_PROJECT = project;
const { db } = require("../lib/config/firebase");
const { createFamily } = require("../lib/services/createFamily");
const { requestJoinFamily } = require("../lib/services/requestJoinFamily");
const { cancelJoinRequest } = require("../lib/services/cancelJoinRequest");
const { approveJoinRequest } = require("../lib/services/approveJoinRequest");
const { rejectJoinRequest } = require("../lib/services/rejectJoinRequest");
const { changeMemberRole } = require("../lib/services/changeMemberRole");
const { removeFamilyMember } = require("../lib/services/removeFamilyMember");
const { leaveFamily } = require("../lib/services/leaveFamily");
const { loadFamilyOverview } = require("../lib/services/loadFamilyOverview");
const { registerPushToken } = require("../lib/services/registerPushToken");
const { advanceRecurringTask } = require("../lib/services/advanceRecurringTask");

const pushes = [];
global.fetch = async (_url, init) => {
  const messages = JSON.parse(init.body);
  pushes.push(...messages);
  return { json: async () => ({ data: messages.map(() => ({ status: "ok" })) }) };
};
const identity = (uid) => ({ email: `${uid}@example.com`, name: uid });
const user = (uid, extra = {}) =>
  db.doc(`users/${uid}`).set({ uid, email: `${uid}@example.com`, displayName: uid, ...extra });
const token = (n) => `ExponentPushToken[token-${n}-abcdefgh]`;
const history = async (familyId) =>
  (await db.collection(`families/${familyId}/history`).orderBy("at").get()).docs.map((d) => d.data());
const code = (family) => family.data().code;
const rejects = (promise, expected) =>
  assert.rejects(promise, (error) => error.code === expected, `esperava ${expected}`);

async function seedFamily() {
  await db.doc("families/fa").set({ name: "Silva", code: "ABC123", createdBy: "admin" });
  await db.doc("families/fb").set({ name: "Souza", code: "XYZ789", createdBy: "boss" });
  await user("admin", { familyId: "fa", role: "admin", pushTokens: [token("admin")] });
  await user("admin2", { familyId: "fa", role: "admin", pushTokens: [token("admin2")] });
  await user("alice", { familyId: "fa", role: "user", pushTokens: [token("alice")] });
  await user("legacy", { familyId: "fa", role: "dependent" });
  await user("boss", { familyId: "fb", role: "admin", pushTokens: [token("boss")] });
  await user("newbie", { pushTokens: [token("newbie")] });
}
beforeEach(async () => {
  pushes.length = 0;
  await fetch_clear();
  await seedFamily();
});
async function fetch_clear() {
  const real = await import("node:http");
  await new Promise((resolve, reject) => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
    const req = real.request(
      { host, port, method: "DELETE", path: `/emulator/v1/projects/${project}/databases/(default)/documents` },
      (res) => { res.resume(); res.on("end", resolve); },
    );
    req.on("error", reject);
    req.end();
  });
}

test("criar grupo torna o criador administrador e registra o histórico", async () => {
  await user("founder");
  const { familyId } = await createFamily("founder", identity("founder"), "Lima");
  const profile = (await db.doc("users/founder").get()).data();
  assert.equal(profile.familyId, familyId);
  assert.equal(profile.role, "admin");
  const events = await history(familyId);
  assert.deepEqual(events.map((e) => [e.type, e.role, e.actorId]), [["family_created", "admin", "founder"]]);
  await rejects(createFamily("founder", identity("founder"), "Outra"), "failed-precondition");
});

test("entrar por código só cria solicitação e avisa apenas os administradores", async () => {
  const result = await requestJoinFamily("newbie", identity("newbie"), "abc123");
  assert.equal(result.status, "pending");
  const profile = (await db.doc("users/newbie").get()).data();
  assert.equal(profile.familyId, undefined);
  const request = (await db.doc("joinRequests/newbie").get()).data();
  assert.equal(request.status, "pending");
  assert.equal(request.familyId, "fa");
  assert.deepEqual(pushes.map((p) => p.to).sort(), [token("admin"), token("admin2")].sort());
  assert.equal(pushes[0].categoryId, "join_request");
  assert.equal(pushes[0].data.requestId, "newbie");
  assert.deepEqual((await history("fa")).map((e) => e.type), ["join_requested"]);
  // Pedido repetido ao mesmo grupo não notifica de novo nem duplica o histórico.
  pushes.length = 0;
  await requestJoinFamily("newbie", identity("newbie"), "ABC123");
  assert.equal(pushes.length, 0);
  assert.equal((await history("fa")).length, 1);
  await rejects(requestJoinFamily("newbie", identity("newbie"), "NOPE999"), "not-found");
  await rejects(requestJoinFamily("newbie", identity("newbie"), "!!"), "invalid-argument");
  await rejects(requestJoinFamily("alice", identity("alice"), "ABC123"), "failed-precondition");
});

test("somente administradores do grupo aprovam, com o acesso escolhido e histórico", async () => {
  await requestJoinFamily("newbie", identity("newbie"), "ABC123");
  pushes.length = 0;
  await rejects(approveJoinRequest("alice", "newbie", "user"), "permission-denied");
  await rejects(approveJoinRequest("legacy", "newbie", "admin"), "permission-denied");
  await rejects(approveJoinRequest("boss", "newbie", "user"), "not-found");
  assert.equal((await db.doc("users/newbie").get()).data().familyId, undefined);
  await approveJoinRequest("admin", "newbie", "admin");
  const profile = (await db.doc("users/newbie").get()).data();
  assert.deepEqual([profile.familyId, profile.role], ["fa", "admin"]);
  const request = (await db.doc("joinRequests/newbie").get()).data();
  assert.deepEqual(
    [request.status, request.decidedBy, request.grantedRole, typeof request.decidedAt],
    ["approved", "admin", "admin", "string"],
  );
  const approved = (await history("fa")).find((e) => e.type === "join_approved");
  assert.deepEqual(
    [approved.actorId, approved.targetId, approved.role, typeof approved.at],
    ["admin", "newbie", "admin", "string"],
  );
  assert.deepEqual(pushes.map((p) => p.to), [token("newbie")]);
  await rejects(approveJoinRequest("admin", "newbie", "user"), "failed-precondition");
});

test("aprovar como usuário e recusar", async () => {
  await requestJoinFamily("newbie", identity("newbie"), "ABC123");
  await approveJoinRequest("admin2", "newbie", "user");
  assert.equal((await db.doc("users/newbie").get()).data().role, "user");
  await user("second");
  await requestJoinFamily("second", identity("second"), "ABC123");
  await rejectJoinRequest("admin", "second");
  assert.equal((await db.doc("users/second").get()).data().familyId, undefined);
  assert.equal((await db.doc("joinRequests/second").get()).data().status, "rejected");
  const rejected = (await history("fa")).find((e) => e.type === "join_rejected");
  assert.deepEqual([rejected.actorId, rejected.targetId], ["admin", "second"]);
  await rejects(rejectJoinRequest("alice", "second"), "permission-denied");
});

test("cancelar solicitação a encerra e impede aprovação posterior", async () => {
  await requestJoinFamily("newbie", identity("newbie"), "ABC123");
  await cancelJoinRequest("newbie");
  assert.equal((await db.doc("joinRequests/newbie").get()).data().status, "cancelled");
  await rejects(approveJoinRequest("admin", "newbie", "user"), "failed-precondition");
  assert.ok((await history("fa")).some((e) => e.type === "join_cancelled"));
});

test("trocar de grupo mantém o grupo atual até a aprovação e registra a saída", async () => {
  await requestJoinFamily("alice", identity("alice"), "XYZ789");
  assert.equal((await db.doc("users/alice").get()).data().familyId, "fa");
  assert.equal((await loadFamilyOverview("alice")).myRequest.familyId, "fb");
  await approveJoinRequest("boss", "alice", "user");
  const profile = (await db.doc("users/alice").get()).data();
  assert.deepEqual([profile.familyId, profile.role], ["fb", "user"]);
  assert.ok((await history("fa")).some((e) => e.type === "member_left" && e.targetId === "alice"));
  assert.ok((await history("fb")).some((e) => e.type === "join_approved"));
});

test("único administrador não troca de grupo deixando outros membros sem gestão", async () => {
  await db.doc("users/admin2").update({ role: "user" });
  await rejects(requestJoinFamily("admin", identity("admin"), "XYZ789"), "failed-precondition");
  await changeMemberRole("admin", "admin2", "admin");
  await requestJoinFamily("admin", identity("admin"), "XYZ789");
});

test("alterar papel exige administrador e preserva ao menos um admin", async () => {
  await rejects(changeMemberRole("alice", "legacy", "admin"), "permission-denied");
  await changeMemberRole("admin", "alice", "admin");
  assert.equal((await db.doc("users/alice").get()).data().role, "admin");
  const change = (await history("fa")).find((e) => e.type === "role_changed");
  assert.deepEqual([change.fromRole, change.toRole, change.actorId], ["user", "admin", "admin"]);
  await changeMemberRole("admin", "legacy", "admin");
  await changeMemberRole("admin2", "admin", "user");
  await changeMemberRole("admin2", "alice", "user");
  await changeMemberRole("admin2", "legacy", "user");
  await rejects(changeMemberRole("admin2", "admin2", "user"), "failed-precondition");
  await rejects(changeMemberRole("admin2", "boss", "user"), "not-found");
});

test("remover membro é restrito a administradores do mesmo grupo", async () => {
  await rejects(removeFamilyMember("alice", "legacy"), "permission-denied");
  await rejects(removeFamilyMember("admin", "admin"), "invalid-argument");
  await rejects(removeFamilyMember("admin", "boss"), "not-found");
  await removeFamilyMember("admin", "alice");
  const profile = (await db.doc("users/alice").get()).data();
  assert.deepEqual([profile.familyId, profile.role], [undefined, undefined]);
  assert.ok((await history("fa")).some((e) => e.type === "member_removed" && e.targetId === "alice"));
});

test("visão geral: e-mails, solicitações e histórico só para administradores", async () => {
  await requestJoinFamily("newbie", identity("newbie"), "ABC123");
  const asAdmin = await loadFamilyOverview("admin");
  assert.equal(asAdmin.role, "admin");
  assert.equal(asAdmin.familyId, "fa");
  assert.equal(asAdmin.members.length, 4);
  assert.ok(asAdmin.members.every((m) => m.email));
  assert.deepEqual(asAdmin.pending.map((p) => p.requestId), ["newbie"]);
  assert.ok(asAdmin.history.length >= 1);
  const asUser = await loadFamilyOverview("alice");
  assert.equal(asUser.role, "user");
  assert.deepEqual(asUser.pending, []);
  assert.deepEqual(asUser.history, []);
  assert.equal(asUser.members.find((m) => m.uid === "admin").email, "");
  assert.equal(asUser.members.find((m) => m.uid === "alice").email, "alice@example.com");
  assert.equal(asUser.members.find((m) => m.uid === "legacy").role, "user");
  const lone = await loadFamilyOverview("newbie");
  assert.deepEqual([lone.familyId, lone.members.length, lone.myRequest.familyName], [null, 0, "Silva"]);
});

test("token de notificação pertence a uma conta por vez e é validado", async () => {
  await registerPushToken("alice", "register", token("shared"));
  await registerPushToken("legacy", "register", token("shared"));
  assert.deepEqual((await db.doc("users/alice").get()).data().pushTokens, [token("alice")]);
  assert.deepEqual((await db.doc("users/legacy").get()).data().pushTokens, [token("shared")]);
  await registerPushToken("legacy", "unregister", token("shared"));
  assert.deepEqual((await db.doc("users/legacy").get()).data().pushTokens, []);
  await rejects(registerPushToken("alice", "register", "invalido"), "invalid-argument");
});

test("pedidos repetidos após cancelar respeitam o intervalo mínimo", async () => {
  await requestJoinFamily("newbie", identity("newbie"), "ABC123");
  await cancelJoinRequest("newbie");
  await rejects(requestJoinFamily("newbie", identity("newbie"), "ABC123"), "resource-exhausted");
});

test("tentativas com código inexistente são limitadas", async () => {
  for (let i = 0; i < 8; i++)
    await rejects(requestJoinFamily("newbie", identity("newbie"), "NOPE999"), "not-found");
  await rejects(requestJoinFamily("newbie", identity("newbie"), "ABC123"), "resource-exhausted");
});

test("recorrente: concluir e pular arquivam a atual e criam a próxima com o mesmo autor", async () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const base = { title: "Remédio", familyId: "fa", createdBy: "alice", userId: "alice", isPrivate: false,
    completed: false, recurrence: "daily", dueDate: today, dueTime: "08:00",
    subtasks: [{ id: "1", title: "Tomar", completed: false, category: "health" }] };
  await db.doc("tasks/rec").set(base);
  await rejects(advanceRecurringTask("boss", "rec", "complete"), "not-found");
  const done = await advanceRecurringTask("admin", "rec", "complete", "1");
  const archived = (await db.doc("tasks/rec").get()).data();
  assert.deepEqual([archived.completed, archived.subtasks[0].completed], [true, true]);
  const next = (await db.doc(`tasks/${done.nextTaskId}`).get()).data();
  assert.equal(next.createdBy, "alice");
  assert.equal(next.lastModifiedBy, "admin");
  assert.equal(next.previousOccurrenceId, "rec");
  assert.ok(next.dueDate > today);
  assert.deepEqual([next.completed, next.subtasks[0].completed, next.subtasks[0].category], [false, false, "health"]);
  await rejects(advanceRecurringTask("alice", "rec", "skip"), "failed-precondition");
  const skipped = await advanceRecurringTask("alice", done.nextTaskId, "skip");
  const skippedDoc = (await db.doc(`tasks/${done.nextTaskId}`).get()).data();
  assert.deepEqual([skippedDoc.skipped, skippedDoc.completed], [true, false]);
  assert.ok((await db.doc(`tasks/${skipped.nextTaskId}`).get()).data().dueDate > next.dueDate);
  await db.doc("tasks/once").set({ ...base, recurrence: "none" });
  await rejects(advanceRecurringTask("alice", "once", "complete"), "failed-precondition");
  await db.doc("tasks/priv").set({ ...base, isPrivate: true });
  // Privada de outra pessoa nem aparece: "não encontrada", sem revelar que existe.
  await rejects(advanceRecurringTask("admin", "priv", "complete"), "not-found");
});

test("sair do grupo: perfil fica sem grupo, privadas somem e compartilhadas ficam", async () => {
  await db.doc("tasks/priv").set({ familyId: "fa", createdBy: "alice", isPrivate: true, title: "p" });
  await db.doc("tasks/pub").set({ familyId: "fa", createdBy: "alice", isPrivate: false, assignedTo: "alice", title: "c" });
  await leaveFamily("alice");
  const profile = (await db.doc("users/alice").get()).data();
  assert.equal(profile.familyId, undefined);
  assert.equal(profile.role, undefined);
  assert.equal((await db.doc("tasks/priv").get()).exists, false);
  assert.equal((await db.doc("tasks/pub").get()).data().assignedTo, null);
  assert.ok((await history("fa")).some((e) => e.type === "member_left" && e.actorId === "alice"));
  // Sem grupo, pode criar um novo.
  await createFamily("alice", identity("alice"), "Nova");
  assert.equal((await db.doc("users/alice").get()).data().role, "admin");
});

test("sair do grupo: único admin com outros membros precisa promover alguém", async () => {
  await db.doc("users/admin2").update({ role: "user" });
  await rejects(leaveFamily("admin"), "failed-precondition");
  assert.equal((await db.doc("users/admin").get()).data().familyId, "fa");
});

test("sair do grupo: último membro apaga o grupo e as tarefas", async () => {
  await db.doc("tasks/t1").set({ familyId: "fb", createdBy: "boss", isPrivate: false, title: "x" });
  await leaveFamily("boss");
  assert.equal((await db.doc("families/fb").get()).exists, false);
  assert.equal((await db.doc("tasks/t1").get()).exists, false);
  await rejects(leaveFamily("boss"), "failed-precondition");
});
