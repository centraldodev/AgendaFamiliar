import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import { normalizeRole } from "../../shared/roles";
import { displayNameOf } from "../../services/displayNameOf";
import { loadFamilyOverview } from "../../services/loadFamilyOverview";
import { toIso } from "../../services/serializeTask";
import { newToken, sha256, tokenCollection, type Caller } from "../authenticate";
import { ApiError, type Router } from "../http";
const maxTokens = 10;
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
  // Tokens pessoais só são geridos com login do Firebase: um token não cria outro.
  const requireFirebase = (current: Caller) => {
    if (current.method !== "firebase")
      throw new ApiError(403, "firebase-login-required", "Gerencie tokens entrando com sua conta no app.");
    return current.uid;
  };
  router.add("GET", "/v1/tokens", async (ctx) => {
    const uid = requireFirebase(ctx.caller);
    const snap = await db.collection(tokenCollection).where("uid", "==", uid).get();
    ctx.res.json({
      tokens: snap.docs
        .filter((doc) => doc.data().revoked !== true)
        .map((doc) => ({
          id: doc.id,
          name: String(doc.data().name ?? ""),
          createdAt: toIso(doc.data().createdAt),
          lastUsedAt: toIso(doc.data().lastUsedAt),
        })),
    });
  });
  router.add("POST", "/v1/tokens", async (ctx) => {
    const uid = requireFirebase(ctx.caller);
    const name = typeof ctx.body.name === "string" ? ctx.body.name.trim() : "";
    if (!name || name.length > 60)
      throw new ApiError(422, "validation-failed", "Dê um nome ao token.", [
        { field: "name", message: "Informe um nome de até 60 caracteres." },
      ]);
    const active = await db.collection(tokenCollection).where("uid", "==", uid).where("revoked", "==", false).count().get();
    if (active.data().count >= maxTokens)
      throw new ApiError(409, "too-many-tokens", `Revogue um token antes de criar outro (máximo ${maxTokens}).`);
    const token = newToken();
    const ref = await db.collection(tokenCollection).add({
      hash: sha256(token),
      uid,
      name,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
      revoked: false,
    });
    // O token aparece só nesta resposta; depois só existe o hash.
    ctx.res.status(201).set("Cache-Control", "no-store").json({ id: ref.id, name, token });
  });
  router.add("DELETE", "/v1/tokens/:id", async (ctx) => {
    const uid = requireFirebase(ctx.caller);
    const ref = db.collection(tokenCollection).doc(ctx.params.id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.uid !== uid) throw new ApiError(404, "not-found", "Token não encontrado.");
    await ref.update({ revoked: true });
    ctx.res.status(204).end();
  });
}
