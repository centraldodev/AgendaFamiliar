const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");

const PROJECT_ID = "agendafamiliar-rules-test-3";
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

// Checks whether a user can safely self-migrate their OWN legacy tasks
// (created before the isPrivate field existed) without any admin credentials.
describe("client-driven legacy backfill (no admin needed)", () => {
  test("querying own tasks by createdBy only (no isPrivate filter) succeeds even for legacy docs", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      await db.collection("tasks").doc("legacyA").set({
        title: "A's legacy task", familyId: "fam1", createdBy: "userA",
      });
      // Someone else's legacy task should NOT show up in this query
      await db.collection("tasks").doc("legacyB").set({
        title: "B's legacy task", familyId: "fam1", createdBy: "userB",
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    const ownQuery = userA
      .collection("tasks")
      .where("familyId", "==", "fam1")
      .where("createdBy", "==", "userA");

    const snap = await assertSucceeds(ownQuery.get());
    expect(snap.docs.map((d) => d.id)).toEqual(["legacyA"]);
  });

  test("the user can then patch their own legacy doc to add isPrivate:false", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("tasks").doc("legacyA").set({
        title: "A's legacy task", familyId: "fam1", createdBy: "userA",
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    await assertSucceeds(
      userA.collection("tasks").doc("legacyA").update({ isPrivate: false })
    );
  });

  test("a user CANNOT patch someone else's legacy doc this way", async () => {
    await seed(async (db) => {
      await db.collection("users").doc("userA").set({ uid: "userA", familyId: "fam1", role: "admin" });
      await db.collection("users").doc("userB").set({ uid: "userB", familyId: "fam1", role: "parent" });
      await db.collection("tasks").doc("legacyB").set({
        title: "B's legacy task", familyId: "fam1", createdBy: "userB",
      });
    });

    const userA = testEnv.authenticatedContext("userA").firestore();
    await assertFails(
      userA.collection("tasks").doc("legacyB").update({ isPrivate: false })
    );
  });
});
