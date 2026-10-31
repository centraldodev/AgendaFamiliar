import type { Request } from "firebase-functions/v2/https";
import { authenticate } from "./authenticate";
import { ApiError, Router, sendProblem, type ApiResponse } from "./http";
import { rateLimit } from "./rateLimit";
import { accountRoutes } from "./routes/account";
import { taskRoutes } from "./routes/tasks";
// API REST (v1). Autentica com "Authorization: Bearer <ID token | token pessoal>".
// Sem cookies, então o CORS pode ser aberto.
const router = new Router();
accountRoutes(router);
taskRoutes(router);
const pathOf = (req: Request) => (req.path || "/").replace(/^\/api(?=\/|$)/, "") || "/";
export async function handleApi(req: Request, res: ApiResponse) {
  const path = pathOf(req);
  res
    .set("Access-Control-Allow-Origin", "*")
    .set("Access-Control-Allow-Headers", "Authorization, Content-Type")
    .set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
    .set("Access-Control-Expose-Headers", "Location, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After");
  if (req.method === "OPTIONS") return void res.status(204).end();
  try {
    const { handler, params } = router.match(req.method, path);
    // Antes de autenticar: limita por IP, para tokens falsos em massa não gerarem leituras.
    rateLimit(`ip:${req.ip ?? "?"}`, Date.now(), 300);
    const who = await authenticate(req.get("authorization"));
    const quota = rateLimit(who.uid);
    res
      .set("RateLimit-Limit", String(quota.limit))
      .set("RateLimit-Remaining", String(quota.remaining))
      .set("RateLimit-Reset", String(quota.reset));
    let body: Record<string, unknown> = {};
    if (["POST", "PATCH"].includes(req.method) && req.rawBody?.length) {
      if (!req.is("application/json"))
        throw new ApiError(415, "unsupported-media-type", "Envie o corpo como application/json.");
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
        throw new ApiError(400, "invalid-json", "O corpo deve ser um objeto JSON.");
      body = req.body;
    }
    const query = Object.fromEntries(
      Object.entries(req.query).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
    await handler({ req, res, caller: who, params, body, query });
  } catch (error) {
    const extra = error as { allowed?: string[]; retryAfter?: number };
    if (extra.allowed) res.set("Allow", extra.allowed.join(", "));
    if (extra.retryAfter) res.set("Retry-After", String(extra.retryAfter));
    sendProblem(res, error, path);
  }
}
