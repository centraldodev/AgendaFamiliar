const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");

const PROJECT_ID = "agendafamiliar-rules-test";
const RULES_PATH = path.resolve(__dirname, "../firestore.rules");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(RULES_PATH, "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seed(setupFn) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setupFn(db);
  });
}

describe("tasks collection - family visibility (reproduces user report)", () => {
  test("member CAN query family tasks when only public tasks exist", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      await db.collection("tasks").doc("task1").set({
        title: "Public task by B",
        familyId: "fam1",
        createdBy: "userB",
        isPrivate: false,
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    // This is the exact query used by FirestoreTaskRepository.subscribe()
    const query = userA.collection("tasks").where("familyId", "==", "fam1");
    await assertSucceeds(query.get());
  });

  test("member's query FAILS ENTIRELY once another member's task has no isPrivate field (legacy data)", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      // Legacy-shaped doc: no isPrivate field at all (as every task created before today's fix)
      await db.collection("tasks").doc("task1").set({
        title: "Legacy task by B",
        familyId: "fam1",
        createdBy: "userB",
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    const query = userA.collection("tasks").where("familyId", "==", "fam1");
    await assertFails(query.get());
  });

  test("member's query FAILS ENTIRELY once another member has ANY private task in the family", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      await db.collection("tasks").doc("task1").set({
        title: "Public task by B",
        familyId: "fam1",
        createdBy: "userB",
        isPrivate: false,
      });
      await db.collection("tasks").doc("task2").set({
        title: "Private task by B",
        familyId: "fam1",
        createdBy: "userB",
        isPrivate: true,
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    const query = userA.collection("tasks").where("familyId", "==", "fam1");
    // If this fails, it explains the user's exact complaint: as soon as ANY
    // family member has a private task, EVERYONE's shared-task query breaks.
    await assertFails(query.get());
  });
});
