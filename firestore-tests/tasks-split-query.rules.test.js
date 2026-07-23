const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");

const PROJECT_ID = "agendafamiliar-rules-test-2";
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
    await setupFn(context.firestore());
  });
}

// This is the proposed fix: instead of one query mixing public+private tasks,
// run two queries whose `where` clauses fully pin down the fields the rule
// depends on, so Firestore can statically prove each query is rule-compliant.
describe("split-query approach (proposed fix)", () => {
  test("public-tasks query succeeds even with other members' private tasks present", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      await db.collection("tasks").doc("task1").set({
        title: "Public task by B", familyId: "fam1", createdBy: "userB", isPrivate: false,
      });
      await db.collection("tasks").doc("task2").set({
        title: "Private task by B", familyId: "fam1", createdBy: "userB", isPrivate: true,
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    const publicQuery = userA
      .collection("tasks")
      .where("familyId", "==", "fam1")
      .where("isPrivate", "==", false);

    const snap = await assertSucceeds(publicQuery.get());
    expect(snap.docs.map((d) => d.id)).toEqual(["task1"]);
  });

  test("own-private-tasks query succeeds and only returns the caller's private tasks", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      await db.collection("tasks").doc("task1").set({
        title: "Private task by A", familyId: "fam1", createdBy: "userA", isPrivate: true,
      });
      await db.collection("tasks").doc("task2").set({
        title: "Private task by B", familyId: "fam1", createdBy: "userB", isPrivate: true,
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    const ownPrivateQuery = userA
      .collection("tasks")
      .where("familyId", "==", "fam1")
      .where("isPrivate", "==", true)
      .where("createdBy", "==", "userA");

    const snap = await assertSucceeds(ownPrivateQuery.get());
    expect(snap.docs.map((d) => d.id)).toEqual(["task1"]);
  });

  test("a member trying to query another member's private tasks directly is denied", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      await db.collection("tasks").doc("task2").set({
        title: "Private task by B", familyId: "fam1", createdBy: "userB", isPrivate: true,
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    const snoopQuery = userA
      .collection("tasks")
      .where("familyId", "==", "fam1")
      .where("isPrivate", "==", true)
      .where("createdBy", "==", "userB");

    await assertFails(snoopQuery.get());
  });

  test("legacy docs without an isPrivate field are invisible to the public query (documents the migration gap)", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("tasks").doc("legacy1").set({
        title: "Legacy task, no isPrivate field", familyId: "fam1", createdBy: "userA",
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    const publicQuery = userA
      .collection("tasks")
      .where("familyId", "==", "fam1")
      .where("isPrivate", "==", false);

    const snap = await assertSucceeds(publicQuery.get());
    expect(snap.docs.map((d) => d.id)).toEqual([]); // confirms legacy docs need a one-time backfill
  });
});
