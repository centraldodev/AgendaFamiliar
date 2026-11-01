import { timingSafeEqual } from "node:crypto";
import { defineSecret, defineString } from "firebase-functions/params";
// Vinculação de conta da Alexa (OAuth 2.0, "Auth Code Grant").
// O Client ID e o Client Secret são os mesmos digitados no console da Alexa.
export const alexaClientId = defineString("ALEXA_CLIENT_ID", { default: "agenda-familiar-alexa" });
export const alexaClientSecret = defineSecret("ALEXA_CLIENT_SECRET");
export const codeTtlMs = 5 * 60 * 1000;
export const accessTtlSeconds = 60 * 60;
// Só devolve o código para os endereços de vinculação da própria Amazon.
const redirectPattern =
  /^https:\/\/(pitangui\.amazon\.com|layla\.amazon\.com|alexa\.amazon\.co\.jp)\/api\/skill\/link\/[A-Za-z0-9]+$/;
export const isAllowedRedirect = (uri: unknown): uri is string =>
  typeof uri === "string" && redirectPattern.test(uri);
const sameText = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
/** Credenciais do cliente pelo cabeçalho Basic (padrão da Alexa) ou pelo corpo. */
export function clientCredentials(header: string | undefined, body: Record<string, unknown>) {
  const basic = /^Basic\s+(.+)$/i.exec(header ?? "");
  if (basic) {
    const decoded = Buffer.from(basic[1], "base64").toString("utf8");
    const split = decoded.indexOf(":");
    if (split < 0) return null;
    return {
      id: decodeURIComponent(decoded.slice(0, split)),
      secret: decodeURIComponent(decoded.slice(split + 1)),
    };
  }
  if (typeof body.client_id === "string" && typeof body.client_secret === "string")
    return { id: body.client_id, secret: body.client_secret };
  return null;
}
export function isValidClient(
  credentials: { id: string; secret: string } | null,
  expected: { id: string; secret: string },
) {
  return !!credentials && !!expected.secret && sameText(credentials.id, expected.id) && sameText(credentials.secret, expected.secret);
}
