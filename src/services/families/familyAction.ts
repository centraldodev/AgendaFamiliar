import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
export type FamilyActionResult = { familyId?: string; status?: "pending" };
export async function familyAction(
  action: "create" | "join" | "leave",
  value?: string,
): Promise<FamilyActionResult> {
  const result = await httpsCallable<unknown, FamilyActionResult>(
    functions,
    "agendaSimpleFamily",
  )({ action, value });
  return result.data;
}
