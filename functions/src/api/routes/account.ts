import { db } from "../../config/firebase";
import { normalizeRole } from "../../shared/roles";
import { displayNameOf } from "../../services/displayNameOf";
import { loadFamilyOverview } from "../../services/loadFamilyOverview";
import { toIso } from "../../services/serializeTask";
import { linkCollection, unlinkAll } from "../../oauth/grants";
import type { Caller } from "../authenticate";
import { ApiError, type Router } from "../http";
export function accountRoutes(router: Router) {
  router.add("GET", "/v1/me", async (ctx) => {
    const { uid, method } = ctx.caller;
    const profile = (await db.doc(`users/${uid}`).get()).data();
    ctx.res.json({
      uid,
      name: profile ? displayNameOf(profile) : null,
      email: typeof profile?.email === "string" ? profile.email : null,
      familyId: typeof profile?.familyId === "string" && profile.familyId ? profile.familyId : null,
      role: profile?.familyId ? normalizeRole(profile.role) : null,
      authMethod: method,
    });
  });
  router.add("GET", "/v1/family", async (ctx) => {
    ctx.res.json(await loadFamilyOverview(ctx.caller.uid));
  });
  // Vinculação com a Alexa: só com login do Firebase (a Alexa não se desvincula sozinha).
  const requireFirebase = (current: Caller) => {
    if (current.method !== "firebase")
      throw new ApiError(403, "firebase-login-required", "Gerencie a Alexa entrando com sua conta no app.");
    return current.uid;
  };
  router.add("GET", "/v1/alexa", async (ctx) => {
    const uid = requireFirebase(ctx.caller);
    const snap = await db.collection(linkCollection).where("uid", "==", uid).get();
    const links = snap.docs
      .map((doc) => ({ createdAt: toIso(doc.data().createdAt), lastUsedAt: toIso(doc.data().lastUsedAt) }))
      .sort((a, b) => String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)));
    ctx.res.json({ linked: links.length > 0, links });
  });
  router.add("DELETE", "/v1/alexa", async (ctx) => {
    await unlinkAll(requireFirebase(ctx.caller));
    ctx.res.status(204).end();
  });
}
