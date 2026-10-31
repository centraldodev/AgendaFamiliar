import type { CallableRequest } from "firebase-functions/v2/https";
import { requireAuth } from "../middlewares/requireAuth";
import { loadFamilyOverview } from "../services/loadFamilyOverview";
export async function handleFamilyOverview(request: CallableRequest) {
  return loadFamilyOverview(requireAuth(request));
}
