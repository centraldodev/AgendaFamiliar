import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import type { FamilyOverview } from "../../models/FamilyOverview";
export async function loadFamilyOverview() {
  const result = await httpsCallable<unknown, FamilyOverview>(
    functions,
    "agendaFamilyOverview",
  )({});
  return result.data;
}
