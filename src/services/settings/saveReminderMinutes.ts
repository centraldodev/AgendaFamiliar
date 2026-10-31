import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { requireAuthenticatedUser } from "../../middlewares/requireAuthenticatedUser";
// Antecedência dos lembretes (minutos; -1 desliga). Vale para todos os aparelhos da conta.
export async function saveReminderMinutes(minutes: number) {
  const { uid } = requireAuthenticatedUser();
  await updateDoc(doc(db, "users", uid), { reminderMinutes: minutes });
}
