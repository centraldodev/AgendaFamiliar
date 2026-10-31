import { apiRequest } from "./apiRequest";
export async function revokeApiToken(id: string) {
  await apiRequest<void>("DELETE", `/v1/tokens/${encodeURIComponent(id)}`);
}
