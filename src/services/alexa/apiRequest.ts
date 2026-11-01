import { apiBaseUrl } from "../../config/api";
import { requireAuthenticatedUser } from "../../middlewares/requireAuthenticatedUser";
// Chamada à API com o login do Firebase (a vinculação da Alexa só é gerida assim).
export async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const idToken = await requireAuthenticatedUser().getIdToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail || "Não foi possível falar com o servidor.");
  return data as T;
}
