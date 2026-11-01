import { apiRequest } from "./apiRequest";
export interface AlexaStatus {
  linked: boolean;
  links: { createdAt: string | null; lastUsedAt: string | null }[];
}
export const getAlexaStatus = () => apiRequest<AlexaStatus>("GET", "/v1/alexa");
/** Desvincula todas as Alexas da conta; a Alexa pede para vincular de novo. */
export const unlinkAlexa = () => apiRequest<void>("DELETE", "/v1/alexa");
