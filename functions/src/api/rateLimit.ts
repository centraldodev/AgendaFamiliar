import { ApiError } from "./http";
// Limite por usuário e por instância (janela fixa de 1 minuto). Não é global,
// mas contém abusos simples sem custo de leitura no banco.
const defaultLimit = 120;
const windowMs = 60_000;
const hits = new Map<string, { start: number; count: number }>();
export function rateLimit(key: string, now = Date.now(), limit = defaultLimit) {
  const entry = hits.get(key);
  if (!entry || now - entry.start >= windowMs) {
    hits.set(key, { start: now, count: 1 });
    if (hits.size > 5000) hits.clear();
    return { limit, remaining: limit - 1, reset: Math.ceil((now + windowMs) / 1000) };
  }
  entry.count++;
  const reset = Math.ceil((entry.start + windowMs) / 1000);
  if (entry.count > limit)
    throw Object.assign(new ApiError(429, "rate-limited", "Limite de requisições excedido. Tente novamente em instantes."), {
      retryAfter: Math.max(1, reset - Math.floor(now / 1000)),
    });
  return { limit, remaining: limit - entry.count, reset };
}
