import type { ApiToken } from "../../models/ApiToken";
import { apiRequest } from "./apiRequest";
export async function listApiTokens() {
  return (await apiRequest<{ tokens: ApiToken[] }>("GET", "/v1/tokens")).tokens;
}
