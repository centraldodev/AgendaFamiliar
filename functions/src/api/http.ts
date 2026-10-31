import type { Request } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import type { Caller } from "./authenticate";
// Resposta mínima usada pela API (subconjunto da Response do Express).
export interface ApiResponse {
  status(code: number): ApiResponse;
  set(field: string, value: string): ApiResponse;
  json(body: unknown): void;
  send(body?: unknown): void;
  end(): void;
}
export type { FieldError } from "../shared/validateTask";
import type { FieldError } from "../shared/validateTask";
// Erro da API, respondido como application/problem+json (RFC 9457 / 7807).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors?: FieldError[],
  ) {
    super(message);
  }
}
const httpsStatus: Record<string, number> = {
  "invalid-argument": 400,
  unauthenticated: 401,
  "permission-denied": 403,
  "not-found": 404,
  "already-exists": 409,
  "failed-precondition": 409,
  "resource-exhausted": 429,
};
const titles: Record<number, string> = {
  400: "Requisição inválida",
  401: "Não autenticado",
  403: "Acesso negado",
  404: "Não encontrado",
  405: "Método não permitido",
  409: "Conflito",
  415: "Tipo de conteúdo não suportado",
  422: "Dados inválidos",
  429: "Muitas requisições",
  500: "Erro interno",
};
export function sendProblem(res: ApiResponse, error: unknown, instance: string) {
  const problem =
    error instanceof ApiError
      ? error
      : error instanceof HttpsError
        ? new ApiError(httpsStatus[error.code] ?? 500, error.code, error.message)
        : new ApiError(500, "internal", "Ocorreu um erro inesperado.");
  if (problem.status >= 500) console.error("api_error", error);
  res
    .status(problem.status)
    .set("Content-Type", "application/problem+json; charset=utf-8")
    .json({
      type: `https://agenda-familiar.app/problems/${problem.code}`,
      title: titles[problem.status] ?? "Erro",
      status: problem.status,
      detail: problem.message,
      instance,
      ...(problem.errors?.length ? { errors: problem.errors } : {}),
    });
}
export interface RouteContext {
  req: Request;
  res: ApiResponse;
  caller: Caller;
  params: Record<string, string>;
  body: Record<string, unknown>;
  query: Record<string, string>;
}
type Handler = (ctx: RouteContext) => Promise<void>;
interface Route {
  method: string;
  parts: string[];
  handler: Handler;
}
// Roteador pequeno: "/v1/tasks/:id" casa segmento a segmento.
export class Router {
  private routes: Route[] = [];
  add(method: string, path: string, handler: Handler) {
    this.routes.push({ method, parts: path.split("/").filter(Boolean), handler });
    return this;
  }
  match(method: string, path: string) {
    const segments = path.split("/").filter(Boolean);
    let pathMatched = false;
    for (const route of this.routes) {
      if (route.parts.length !== segments.length) continue;
      const params: Record<string, string> = {};
      const ok = route.parts.every((part, i) => {
        if (part.startsWith(":")) {
          params[part.slice(1)] = decodeURIComponent(segments[i]);
          return true;
        }
        return part === segments[i];
      });
      if (!ok) continue;
      pathMatched = true;
      if (route.method === method) return { handler: route.handler, params };
    }
    if (pathMatched) {
      const allowed = this.routes
        .filter((r) => r.parts.length === segments.length)
        .map((r) => r.method);
      throw Object.assign(new ApiError(405, "method-not-allowed", "Método não permitido para este recurso."), { allowed });
    }
    throw new ApiError(404, "not-found", "Recurso não encontrado.");
  }
}
