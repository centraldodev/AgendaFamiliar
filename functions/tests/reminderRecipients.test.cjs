const test = require("node:test");
const assert = require("node:assert");
const { reminderRecipients } = require("../lib/services/notifyDueTasks");
const members = ["ana", "bia", "caio"].map((uid) => ({ uid, lead: 0 }));
const uids = (task) => reminderRecipients(task, members).map((m) => m.uid);
test("lembrete: sem responsável vai para a família toda", () => {
  assert.deepStrictEqual(uids({ isPrivate: false, createdBy: "ana", assignedTo: null }), ["ana", "bia", "caio"]);
});
test("lembrete: com responsável vai só para ele e para quem criou", () => {
  assert.deepStrictEqual(uids({ isPrivate: false, createdBy: "ana", assignedTo: "caio" }), ["ana", "caio"]);
  assert.deepStrictEqual(uids({ isPrivate: false, createdBy: "ana", assignedTo: "ana" }), ["ana"]);
});
test("lembrete: privada só para quem criou", () => {
  assert.deepStrictEqual(uids({ isPrivate: true, createdBy: "bia" }), ["bia"]);
});
