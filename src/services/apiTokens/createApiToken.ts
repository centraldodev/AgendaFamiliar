import { apiRequest } from "./apiRequest";
/** O token completo só existe nesta resposta. */
export async function createApiToken(name: string) {
  return apiRequest<{ id: string; name: string; token: string }>("POST", "/v1/tokens", { name });
}
