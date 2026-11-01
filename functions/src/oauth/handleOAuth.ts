import { getAuth } from "firebase-admin/auth";
import type { Request } from "firebase-functions/v2/https";
import type { ApiResponse } from "../api/http";
import { rateLimit } from "../api/rateLimit";
import { alexaClientId, alexaClientSecret, clientCredentials, isAllowedRedirect, isValidClient } from "./config";
import { createCode, exchangeCode, GrantError, refreshAccess } from "./grants";
import { errorPage, loginPage } from "./loginPage";
// Servidor OAuth 2.0 da vinculação de conta da Alexa:
//   GET  /authorize  página de login (aberta pelo app Alexa)
//   POST /authorize  { idToken, clientId, redirectUri, state } → { redirect } com ?code&state
//   POST /token      grant_type=authorization_code | refresh_token (cliente via Basic)
const maxLoginAgeSeconds = 10 * 60;
const pathOf = (req: Request) => (req.path || "/").replace(/\/+$/, "") || "/";
const text = (value: unknown) => (typeof value === "string" ? value : "");
function html(res: ApiResponse, status: number, body: string) {
  res
    .status(status)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "no-store")
    .set("X-Frame-Options", "DENY")
    .set("Referrer-Policy", "no-referrer")
    .send(body);
}
function json(res: ApiResponse, status: number, body: unknown) {
  res.status(status).set("Cache-Control", "no-store").set("Pragma", "no-cache").json(body);
}
function showLogin(req: Request, res: ApiResponse) {
  const q = req.query;
  if (text(q.client_id) !== alexaClientId.value() || !isAllowedRedirect(q.redirect_uri))
    return html(res, 400, errorPage("Pedido de vinculação inválido. Comece de novo pelo app Alexa."));
  if (text(q.response_type) !== "code")
    return html(res, 400, errorPage("Tipo de resposta não suportado."));
  html(res, 200, loginPage({ clientId: text(q.client_id), redirectUri: q.redirect_uri, state: text(q.state) }));
}
async function authorize(req: Request, res: ApiResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const fail = (status: number, detail: string) => json(res, status, { detail });
  if (text(body.clientId) !== alexaClientId.value() || !isAllowedRedirect(body.redirectUri))
    return fail(400, "Pedido de vinculação inválido. Comece de novo pelo app Alexa.");
  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(text(body.idToken), true);
    // Só aceita um login feito agora, nesta página.
    if (Date.now() / 1000 - decoded.auth_time > maxLoginAgeSeconds) return fail(401, "Entre de novo para vincular.");
    uid = decoded.uid;
  } catch {
    return fail(401, "Não foi possível confirmar o login. Tente de novo.");
  }
  const code = await createCode(uid, text(body.clientId), body.redirectUri);
  const target = new URL(body.redirectUri);
  target.searchParams.set("code", code);
  if (text(body.state)) target.searchParams.set("state", text(body.state));
  json(res, 200, { redirect: target.toString() });
}
async function token(req: Request, res: ApiResponse) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const credentials = clientCredentials(req.get("authorization"), body);
  if (!isValidClient(credentials, { id: alexaClientId.value(), secret: alexaClientSecret.value() }))
    return json(res.set("WWW-Authenticate", 'Basic realm="agenda-familiar"'), 401, { error: "invalid_client" });
  try {
    const grantType = text(body.grant_type);
    if (grantType === "authorization_code")
      return json(res, 200, await exchangeCode(body.code, body.redirect_uri, credentials!.id));
    if (grantType === "refresh_token") return json(res, 200, await refreshAccess(body.refresh_token, credentials!.id));
    json(res, 400, { error: "unsupported_grant_type" });
  } catch (error) {
    if (error instanceof GrantError) return json(res, 400, { error: error.code });
    throw error;
  }
}
export async function handleOAuth(req: Request, res: ApiResponse) {
  try {
    rateLimit(`oauth:${req.ip ?? "?"}`, Date.now(), 60);
    const route = `${req.method} ${pathOf(req)}`;
    if (route === "GET /authorize") return showLogin(req, res);
    if (route === "POST /authorize") return await authorize(req, res);
    if (route === "POST /token") return await token(req, res);
    json(res, 404, { error: "not_found" });
  } catch (error) {
    if ((error as { status?: number }).status === 429) return json(res, 429, { error: "slow_down" });
    console.error("oauth_error", error);
    json(res, 500, { error: "server_error" });
  }
}
